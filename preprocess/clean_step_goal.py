import json
from argparse import ArgumentParser
from tqdm import tqdm

class Dataset:
  def __init__(self):
    print("Loading category id")
    self.category_id_map = json.load(open("data/category_id_map.json"))
    print("Loading step goal")
    self.step_goal = json.load(open("data/step_goal.json"))
    self.goal_id_map = {item["task"]: i for (i, item) in enumerate(self.step_goal)}
    print("Loading step predictions")
    self.step_predictions = json.load(open("data/all.org.t30.test.deterta.t30.train_null.goal.c1.all.result"))
    self.step_id_map = {item["step"]: i for (i, item) in enumerate(self.step_predictions)}

class Processor:
  def __init__(self, num_to_keep=1000):
    self.num_to_keep = num_to_keep
    self.used_step_ids = set()
    self.to_process_goals = list(range(self.num_to_keep))
    self.processed_goals = {}
    self.processed_step_predictions = {}
    self.processed_goal_ids = set()

  def start_iteration(self, dataset):
    iter_count = 0
    while True:
      iter_count += 1
      curr_num_used_step_ids = len(self.used_step_ids)
      curr_num_processed_goals = len(self.processed_goals)
      self.process(iter_count, dataset)
      new_num_used_step_ids = len(self.used_step_ids)
      new_num_processed_goals = len(self.processed_goals)
      if new_num_used_step_ids > curr_num_used_step_ids or new_num_processed_goals > curr_num_processed_goals: pass
      else: break

  def process(self, iter_count, dataset):
    curr_to_process_goals = self.to_process_goals
    self.to_process_goals = []
    for goal_id in tqdm(curr_to_process_goals, desc=f"Iteration {iter_count}"):
      if goal_id in self.processed_goal_ids: continue
      preprocessed_item = self.process_one(dataset.step_goal[goal_id], dataset)
      self.processed_goals[goal_id] = preprocessed_item
      self.processed_goal_ids.add(goal_id)

  def process_one(self, item, dataset):
    category_strings = item["category"]
    preprocessed_item = item

    # First process category
    preprocessed_item["category"] = [dataset.category_id_map[category_str] for category_str in category_strings]

    # Then process captions
    step_id_steps = []
    for step in item["caption"]:
      if step[len(step) - 1] == ".":
        step = step[0:len(step) - 1]
      if step in dataset.step_id_map:
        step_id = dataset.step_id_map[step]

        # Go to the step_id in the step_predictions
        step_prediction = dataset.step_predictions[step_id]["pred"]
        sorted_predictions = sorted(list(step_prediction.items()), key=lambda i: i[1], reverse=True)

        # Check if the prediction gives nothing
        if sorted_predictions[0][0] == "[unused2]":
          continue

        # Add the step_id to used_step_ids
        self.used_step_ids.add(step_id)
        step_id_steps.append(step_id)

        # Iterate through the predictions
        goals = []
        for prediction, score in sorted_predictions:
          if prediction == "[unused2]": break
          else:
            if prediction in dataset.goal_id_map:
              goal_id = dataset.goal_id_map[prediction]
              self.to_process_goals.append(goal_id)
              goals.append((goal_id, score))
        self.processed_step_predictions[step_id] = {"name": step, "pred": goals}
      else:
        step_id_steps.append(step)
    preprocessed_item["caption"] = step_id_steps

    return preprocessed_item

  def extract_step_goals(self):
    return self.processed_goals

  def extract_step_predictions(self):
    return self.processed_step_predictions


parser = ArgumentParser()
parser.add_argument("--initial-count", type=int, default=1000)
args = parser.parse_args()

dataset = Dataset()
processor = Processor(num_to_keep=args.initial_count)
processor.start_iteration(dataset)

json.dump(processor.extract_step_goals(), open("data/preprocessed_step_goals.json", "w"))
json.dump(processor.extract_step_predictions(), open("data/preprocessed_step_predictions.json", "w"))
