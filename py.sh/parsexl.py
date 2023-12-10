import openpyxl
import json
import re
import requests


def parse_google_maps_url(row_data, google_maps_url):

    response = requests.get(google_maps_url)

    pattern = r'@(-?\d+\.\d+),(-?\d+\.\d+)'

    match = re.search(pattern, response.url)

    if match:
        latitude = float(match.group(1))
        longitude = float(match.group(2))
        row_data['latitude'] = latitude
        row_data['longitude'] = longitude

    return row_data

def excel_to_json(excel_file_path):
    workbook = openpyxl.load_workbook(excel_file_path)
    sheet = workbook.active
    columns = [cell.value for cell in sheet[1]]
    data = []

    for row in sheet.iter_rows(min_row=2, values_only=True):
        if row[columns.index("shop_name")] is not None and row[columns.index("shop_name")].strip() != "":
            if row[columns.index("directions")] is not None and row[columns.index("directions")].strip() != "":
                row_data = dict(zip(columns, row))
                row_data = parse_google_maps_url(row_data, row[columns.index("directions")])
                data.append(row_data)

    workbook.close()
    return data

excel_file_path = 'sheet.xlsx'

json_data = excel_to_json(excel_file_path)

with open('output.json', 'w') as file:
    json.dump(json_data, file, indent=2)
