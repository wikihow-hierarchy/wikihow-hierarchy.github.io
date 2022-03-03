function load_data(callback) {
  $.getJSON("data/category_list.json", function (category_list) {
    $.getJSON("data/preprocessed_step_goals.json", function (step_goals) {
      $.getJSON("data/preprocessed_step_predictions.json", function (step_predictions) {
        callback(new Dataset(category_list, step_goals, step_predictions));
      });
    });
  });
}

class Dataset {
  constructor(category_list, step_goals, step_predictions) {
    this.category_list = category_list;
    this.step_goals = step_goals;
    this.step_predictions = step_predictions;
  }

  num_tasks() {
    return Object.keys(this.step_goals).length
  }

  sample_datapoint() {
    let id = Math.floor(Math.random() * this.num_tasks());
    return new Datapoint(Object.keys(this.step_goals)[id], null, null);
  }

  get_card_data(datapoint, caption_id_prefix) {
    let task = this.step_goals[datapoint.task_id];
    return {
      title: task["task"],
      elem_id: `${caption_id_prefix}-card`,
      task_id: datapoint.task_id,
      tags: task["category"].map((c) => {
        return {id: c, name: this.category_list[c]};
      }),
      captions: task["caption"].map((c) => {
        if (Number.isInteger(c)) {
          let pred = this.step_predictions[`${c}`];
          return {
            caption: pred.name,
            step_id: c,
            has_sub_steps: pred.pred.length > 0,
            elem_id: `${caption_id_prefix}-caption-${c}`,
          }
        } else {
          return {caption: c}
        }
      }),
    }
  }
}
