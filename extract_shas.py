import json

with open('tree_client.json', 'r') as f:
    data = json.load(f)

ui_files = {}
for item in data['tree']:
    path = item['path']
    if path.startswith('src/components/ui/') or path == 'src/lib/utils.ts':
        ui_files[path] = item['sha']

print(json.dumps(ui_files, indent=2))

