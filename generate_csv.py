import csv
import json
import sys
def generate_csv(data):
    rows = []

    for student in data:
        for date, attendance in student["attendance_data"].items():
            row = {
                "name": student["name"],
                "rollno": student["rollno"],
                "date": date,
                "Math_attendance": attendance.get("Math"),
                "Science_attendance": attendance.get("Science"),
                "English_attendance": attendance.get("English"),
                "History_attendance": attendance.get("History"),
                "Geography_attendance": attendance.get("Geography"),
                "Math_percentage": student["subject_attendance_percentage"].get("Math"),
                "Science_percentage": student["subject_attendance_percentage"].get("Science"),
                "English_percentage": student["subject_attendance_percentage"].get("English"),
                "History_percentage": student["subject_attendance_percentage"].get("History"),
                "Geography_percentage": student["subject_attendance_percentage"].get("Geography")
            }
            rows.append(row)

    fieldnames = [
        "name", "rollno", "date",
        "Math_attendance", "Science_attendance", "English_attendance", 
        "History_attendance", "Geography_attendance",
        "Math_percentage", "Science_percentage", "English_percentage", 
        "History_percentage", "Geography_percentage"
    ]

    output_file = "attendance_report.csv"
    with open(output_file, mode="w", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"CSV file '{output_file}' has been generated successfully.")



if __name__ == '__main__':
    
    input_data = json.loads(sys.argv[1])
    result = generate_csv(input_data)

    print(result)  
