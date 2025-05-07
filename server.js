const express = require('express');
const mongoose = require('mongoose');
const { spawn } = require('child_process');
const fs = require('fs');

const { createObjectCsvWriter } = require('csv-writer');
const csv = require('csv-parser');
const app = express();
const path = require('path');
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const cors = require("cors");
app.use(cors());
app.use(express.json());
const { MongoClient } = require("mongodb");
const session = require("express-session");
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
app.use(session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: true
}));

mongoose.connect('mongodb://localhost:27017/ABC_school')
  .then(() => console.log("Connected to database"))
  .catch((err) => console.log(err));

app.use(bodyParser.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    password: { type: String, required: true },
 
  });
  
  const User = mongoose.model("User", userSchema);
  
app.get('/generate-csv', async (req, res) => {
  const { schoolname, classname } = req.query;
    

    try {
      const schoolDb = mongoose.connection.useDb(schoolname);


        const classData = await schoolDb.collection(classname).find({}).toArray();

        if (!classData || classData.length === 0) {
            return res.status(404).send('Class data not found');
        }

        const classDataJson = JSON.stringify(classData);
        res.status(200)
       
        const pythonProcess = spawn('python', ['generate_csv.py', classDataJson]);
        
       

       

    } catch (err) {
        console.log(err);
        res.status(500).send('Error retrieving data');
    }
});

app.get('/generate-csv-fee', async (req, res) => {
    const { schoolname, classname } = req.query;

 

  try {

    const client = new MongoClient("mongodb://localhost:27017");
    await client.connect();
    const db = client.db(schoolname); 
    const collection = db.collection(classname);
    const feeData = await collection.find({}, { projection: { name: 1, fee_data: 1, _id: 0 } }).toArray();

     

      const classDataJson = JSON.stringify(feeData);
      
     console.log(classDataJson)
      const pythonProcess = spawn('python', ['generate_csv_fee.py', classDataJson]);
      
     res.status(200);

     

  } catch (err) {
      console.log(err);
      res.status(500).send('Error retrieving data');
  }
});

app.post("/submit", async (req, res) => {
  const { name, password } = req.body;

  if (!name || !password) {
    return res.status(400).send("All fields are required.");
  }

  try {
 
    const mainConnection = mongoose.createConnection('mongodb://localhost:27017/MainDB', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

   
    const UserSchema = new mongoose.Schema({
      name: String,
      password: String,
    });
    const User = mainConnection.model("User", UserSchema);

    
    const hashedPassword = await bcrypt.hash(password, 10);

   
    const user = new User({ name, password: hashedPassword });
    await user.save();
    
    res.status(200);
    res.redirect("/input")
    
   

    
  
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal server error");
  }
});

  
  app.post('/loginuser', async (req, res) => {
    const { username, password } = req.body;
  
    try {
      
      const connection = mongoose.createConnection(`mongodb://localhost:27017/MainDB`
    
      );
  
     
      const UserSchema = new mongoose.Schema({
        name: String,
        password: String,
      });
      const User = connection.model("User", UserSchema);
  
   
      const user = await User.findOne({ name: username });
      if (!user) {
        return res.status(400).json({ message: "Incorrect username or password" });
      }
  
      
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        req.session.user = user; // Save user to session
        res.status(200).json({ message: "Login successful", redirect: "/dashboard" });
      } else {
        res.status(400).json({ message: "Incorrect username or password" });
      }
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ message: "Error processing login" });
    }
  });
  

async function importCsvToMongoDB(filePath, dbName, collectionName, Fees) {
  const uri = "mongodb://localhost:27017"; 
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const documents = [];

    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
       
        documents.push({
          name: row.name,
          rollno: row.rollno,
          fee_data: {
            total_amount: Fees,
            amount_paid: 0,
            due_amount: Fees,
          },
        });
      })
      .on('end', async () => {
        console.log(`CSV file successfully processed. Rows: ${documents.length}`);

        try {
          const result = await collection.insertMany(documents);
          console.log(`${result.insertedCount} documents inserted into the collection`);

         
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error("Error deleting file:", err);
            } else {
              console.log("Uploaded file deleted successfully");
            }
          });
        } catch (insertError) {
          console.error("Error inserting documents:", insertError);
        } finally {
          client.close();
        }
      });
  } catch (error) {
    console.error("Error:", error);
    client.close();
  }
}
  app.post('/upload-csv', upload.single('csvFile'), async (req, res) => {
    const { collectionName } = req.body;
    const {schoolname} = req.body;
    const csvFilePath = req.file.path;
    const {Fee} = req.body;
    const Fees = parseInt(Fee, 10);
  console.log(csvFilePath);
    if (!collectionName) {
      return res.status(400).send('Collection name is required');
    }
  
    try {
      await importCsvToMongoDB(csvFilePath, schoolname, collectionName,Fees);
      res.redirect('/updation');
      
    } catch (error) {
      console.error("Error during import:", error);
      res.status(500).send('Failed to import CSV data');
    } 
  });
 
  app.post("/mark-absentees", async (req, res) => {
    const { date, subject, absentees,schoolName,className } = req.body;
    const uri = "mongodb://localhost:27017"; 
    const client = new MongoClient(uri);
  
    if (!date || !subject || !absentees || !Array.isArray(absentees)) {
      return res.status(400).send({ message: "Invalid input data" });
    }
  
    try {
      await client.connect();
    
      const db = client.db(schoolName);
      const collection = db.collection(className);
  
      
      const absentBulkOps = absentees.map(name => ({
        updateOne: {
          filter: { name },
          update: {
            $set: {
              [`attendance_data.${date}.${subject}`]: "Absent"
            }
          }
        }
      }));
      await collection.bulkWrite(absentBulkOps);
  
      
      await collection.updateMany(
        { name: { $nin: absentees } }, 
        {
          $set: {
            [`attendance_data.${date}.${subject}`]: "Present"
          }
        }
      );
  
      
      const students = await collection.find().toArray();
      const uniqueDates = new Set();
  
      students.forEach(student => {
        const attendanceData = student.attendance_data || {};
        Object.keys(attendanceData).forEach(dateKey => {
          if (attendanceData[dateKey][subject]) {
            uniqueDates.add(dateKey); 
          }
        });
      });
    
      const totalClasses = uniqueDates.size;
    
  
     
      const updates = students.map(student => {
        const attendanceData = student.attendance_data || {};
       
        const subjectAttendance = Object.entries(attendanceData)
        .filter(([_, value]) => value.hasOwnProperty(subject))
       
        const presentCount = subjectAttendance.filter(([_, value]) => value[subject] === "Present").length;
        console.log(presentCount)
        const attendancePercentage = totalClasses > 0 ? (presentCount / totalClasses) * 100 : 0;
  
        return {
          updateOne: {
            filter: { name: student.name },
            update: {
              $set: {
                [`subject_attendance_percentage.${subject}`]: attendancePercentage.toFixed(2) // Save percentage
              }
            }
          }
        };
      });
  
      await collection.bulkWrite(updates);
  
      res.send({
        message: `Attendance updated successfully, and percentages calculated for ${students.length} students.`
      });
     
    } catch (error) {
      console.error("Error:", error);
      res.status(500).send({ message: "Failed to update attendance." });
    } finally {
      await client.close();
    }
  });
  
  
  
  
  async function exportCollectionsToCSV(databaseName) {
    try {
      const client = new MongoClient("mongodb://localhost:27017");
      await client.connect();
  
      console.log(`Connected to MongoDB server`);
  
      const db = client.db(databaseName);
      const collections = await db.listCollections().toArray();
  
      if (collections.length === 0) {
        console.log("No collections found in the database.");
        return;
      }
  
      let combinedData = []; // Array to store data from all collections
  
      for (const collectionInfo of collections) {
        const collectionName = collectionInfo.name;
        console.log(`Processing collection: ${collectionName}`);
  
        const documents = await db.collection(collectionName).find({}).toArray();
  
        if (documents.length === 0) {
          console.log(`Collection ${collectionName} is empty, skipping.`);
          continue;
        }
  
        console.log(`Found ${documents.length} documents in collection ${collectionName}`);
  
        const flattenedData = documents.flatMap(doc => {
          const { name, rollno, attendance_data, subject_attendance_percentage } = doc;
  
          if (typeof attendance_data !== "object" || attendance_data === null) {
            console.log(`Invalid or missing attendance_data for document: ${JSON.stringify(doc)}`);
            return [];
          }
  
          return Object.entries(attendance_data).map(([date, subjects]) => ({
            name,
            rollno,
            date,
            Math_attendance: subjects.Math || "N/A",
            Science_attendance: subjects.Science || "N/A",
            English_attendance: subjects.English || "N/A",
            History_attendance: subjects.History || "N/A",
            Geography_attendance: subjects.Geography || "N/A",
            Math_percentage: subject_attendance_percentage?.Math || 0,
            Science_percentage: subject_attendance_percentage?.Science || 0,
            English_percentage: subject_attendance_percentage?.English || 0,
            History_percentage: subject_attendance_percentage?.History || 0,
            Geography_percentage: subject_attendance_percentage?.Geography || 0,
          }));
        });
  
        if (flattenedData.length === 0) {
          console.log(`No valid attendance data in collection ${collectionName}, skipping.`);
          continue;
        }
  
        console.log(`Flattened data size for collection ${collectionName}: ${flattenedData.length}`);
  
        
        combinedData.push(...flattenedData);
      }
  
      if (combinedData.length === 0) {
        console.log("No valid data found in any collection to export.");
        return;
      }
  
      console.log(`Total records to be exported: ${combinedData.length}`);
  
      
      const csvWriter = createObjectCsvWriter({
        path: `attendance_report.csv`,
        header: [
          { id: "name", title: "Name" },
          { id: "rollno", title: "Roll No" },
          { id: "date", title: "Date" },
          { id: "Math_attendance", title: "Math Attendance" },
          { id: "Science_attendance", title: "Science Attendance" },
          { id: "English_attendance", title: "English Attendance" },
          { id: "History_attendance", title: "History Attendance" },
          { id: "Geography_attendance", title: "Geography Attendance" },
          { id: "Math_percentage", title: "Math Percentage" },
          { id: "Science_percentage", title: "Science Percentage" },
          { id: "English_percentage", title: "English Percentage" },
          { id: "History_percentage", title: "History Percentage" },
          { id: "Geography_percentage", title: "Geography Percentage" },
        ],
      });
  
      
      await csvWriter.writeRecords(combinedData);
      console.log(`All data exported to combined_data.csv`);
  
      await client.close();
    } catch (err) {
      console.error("Error exporting collections:", err);
    }
  }
  app.post("/update-fee", async (req, res) => {
    const { schoolName, className, studentName, amountPaid } = req.body;

    if (!schoolName || !className || !studentName || typeof amountPaid !== "number" || amountPaid <= 0) {
        return res.status(400).json({ message: "Invalid input. Ensure all fields are provided and amountPaid is a positive number." });
    }

    const client = new MongoClient("mongodb://localhost:27017");
    try {
        await client.connect();
        const db = client.db(schoolName); 
        const collection = db.collection(className);

        
        const student = await collection.findOne({
      
            name: studentName,
        });
        console.log(student)
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        if (!student.fee_data) {
            return res.status(400).json({ message: "Fee data is not available for this student." });
        }

        if (amountPaid > student.fee_data.due_amount) {
            return res.status(400).json({ message: "Amount paid exceeds the due amount." });
        }

       
        const updatedFeeData = {
            "fee_data.amount_paid": student.fee_data.amount_paid + amountPaid,
            "fee_data.due_amount": student.fee_data.due_amount - amountPaid,
        };

     
        const result = await collection.updateOne(
            { name: studentName },
            { $set: updatedFeeData }
        );

        if (result.modifiedCount === 1) {
            res.status(200).json({ message: "Fee data updated successfully" });
        } else {
            res.status(500).json({ message: "Failed to update fee data" });
        }
    } catch (error) {
        console.error("Error updating fee data:", error);
        res.status(500).json({ message: "An error occurred while updating fee data" });
    } finally {
        await client.close();
    }
});

  
  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "templates", "home.html"));
  });
  
  app.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "templates", "register.html"));
  });
  
  app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "templates", "dashboard.html"));
  });
  
  app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "templates", "login.html"));
  });
  app.get("/input", (req, res) => {
    res.sendFile(path.join(__dirname, "templates", "csv_input.html"));
  });
  app.get("/updation", (req, res) => {
    res.sendFile(path.join(__dirname, "templates", "updation.html"));
  });
  app.get("/api",(req,res)=>{
    res.sendFile(path.join(__dirname, "templates", "api_key.html"));
  });
  app.get("/fee",(req,res)=>{
    res.sendFile(path.join(__dirname, "templates", "fee.html"));
  });
app.listen(3000, () => console.log('Server started on port 3000'));

