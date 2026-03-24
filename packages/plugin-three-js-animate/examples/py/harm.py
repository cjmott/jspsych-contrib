import json

# Replace 'data.json' with the path to your JSON file
with open('../scenarios/trajectory.json', 'r', encoding='utf-8') as file:
    data = json.load(file)

print(data.keys())
print(data['grid'])
print(data['trajectory'][0]['observations']['A']['actual_obs'])