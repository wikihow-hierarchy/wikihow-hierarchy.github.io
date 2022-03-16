import json
import pickle

step_goals_json = json.load(open("data/preprocessed_step_goals.json"))
en_title_url_pkl = pickle.load(open("data/en_title_url.pkl", "rb"))

for (k, v) in step_goals_json.items():
  if v["task"] in en_title_url_pkl:
    v["url"] = en_title_url_pkl[v["task"]]

json.dump(step_goals_json, open("data/preprocessed_step_goals.json", "w"))
