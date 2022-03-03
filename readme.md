# Wikihow Hierarchy Visualizer

## How to use

Start a local server:

```
$ python3 -m http.server
```

Then, visit the following url in browser: `localhost:8000`.

## How to pre-process dataset

Copy the files

```
all.org.t30.test.deterta.t30.train_null.goal.c1.all.result
step_goal.json
```

into the `data` folder.
And then run the following two scripts:

```
$ python3 preprocess/all_categories.py
$ python3 clean_step_goal.py --initial-count 1000
```

Note that the initial count is set to 1000, allowing the preprocessor to pick 1000 tasks initially.
More tasks will be added to the resulting dataset if they are connected.

These scripts will generate the following 4 files:

```
category_id_map.json
category_list.json
preprocessed_step_goals.json
preprocessed_step_predictions.json
```

which will be the dataset supporting the visualization.
