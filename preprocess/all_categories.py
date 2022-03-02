import json

histogram_num_classes = 50

step_goal = json.load(open("data/step_goal.json"))

all_categories = {}

for item in step_goal:
  for category in item["category"]:
    if category in all_categories:
      all_categories[category] += 1
    else:
      all_categories[category] = 1

print(all_categories)
print(len(all_categories))

histogram_items = list(range(histogram_num_classes)) + [f"> {histogram_num_classes}"]
histogram = {str(i): 0 for i in histogram_items}

for category, count in all_categories.items():
  if count >= histogram_num_classes: histogram[f"> {histogram_num_classes}"] += 1
  else: histogram[str(count)] += 1

print(histogram)

category_id_map = {}
category_list = []
for category, _ in all_categories.items():
  category_id_map[category] = len(category_id_map)
  category_list.append(category)

json.dump(category_id_map, open("data/category_id_map.json", "w"))
json.dump(category_list, open("data/category_list.json", "w"))
