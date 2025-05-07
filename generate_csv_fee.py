import sys
import csv
import json
import os


def generate_fee_csv(data):
    rows = []

    for student in data:
        row = {
            'name': student.get('name', ''),
            'total_amount': student['fee_data'].get('total_amount', ''),
            'amount_paid': student['fee_data'].get('amount_paid', ''),
            'due_amount': student['fee_data'].get('due_amount', ''),
        }
        rows.append(row)

    
    fieldnames = ['name', 'total_amount', 'amount_paid', 'due_amount']

    output_file = 'fee_report.csv'
    with open(output_file, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    return f"CSV file '{output_file}' created successfully."


if __name__ == '__main__':
   
    input_data = json.loads(sys.argv[1])
    result = generate_fee_csv(input_data)

    print(result)
