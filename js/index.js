$(document).ready(function () {
  load_data(function (dataset) {
    let visualizer = new Visualizer();

    function initialize() {
      let query_string = window.location.search;
      let url_params = new URLSearchParams(query_string);
      if (url_params.has("task_id")) {
        let task_id = url_params.get("task_id");
        let step_id = url_params.has("step_id") ? url_params.get("step_id") : null;
        let datapoint = new Datapoint(task_id, step_id, null);
        visualizer.visualize(datapoint, dataset);
      } else {
        let curr_datapoint = dataset.sample_datapoint();
        visualizer.visualize(curr_datapoint, dataset);
      }
    }

    initialize();
  });
});

function load_data(callback) {
  $.getJSON("data/category_list.json", function (category_list) {
    $.getJSON("data/preprocessed_step_goals.json", function (step_goals) {
      $.getJSON("data/preprocessed_step_predictions.json", function (step_predictions) {
        callback(new Dataset(category_list, step_goals, step_predictions));
      });
    });
  });
}

class Visualizer {
  constructor() {
    this.card_template = $.templates("#card");
  }

  visualize(datapoint, dataset) {
    $("#curr-task-id").text(datapoint.task_id);

    // Get the data
    let data = dataset.get_card_data(datapoint, "left");

    // Render the object onto the page
    $("#left-inner").html(this.card_template.render(data));

    // Setup the callbacks
    data.captions.forEach((caption) => {
      let step_id = caption.step_id;
      if (step_id && caption.has_sub_steps) {
        $(`#left-caption-${step_id}`).click(() => {
          this.visualize_step(datapoint, step_id, dataset);
        });
      }
    });

    // If the step id is present, directly visualize that step
    if (datapoint.step_id != null) {
      this.visualize_step(datapoint, datapoint.step_id, dataset);
    } else {
      $("#right-inner").html("");
      $("#line-canvas").attr("style", "display: none");
    }
  }

  visualize_step(parent_datapoint, step_id, dataset) {
    $("#line-canvas").attr("style", "display: block");

    // Push history
    var new_url = new URL(window.location.href);
    new_url.search = `?task_id=${parent_datapoint.task_id}&step_id=${step_id}`;
    window.history.pushState({ path: new_url.href }, '', new_url.href);

    // Highlight the step in the left
    $(`#left-caption-${step_id}`).addClass("active").siblings().removeClass("active");

    // Clear the right
    $("#right-inner").html("");

    // Get all the predictions
    let predictions = dataset.step_predictions[`${step_id}`]["pred"];

    // For each prediction
    predictions.forEach((prediction) => {
      let task_id = prediction[0];
      let datapoint = new Datapoint(task_id, null, null);
      let data = dataset.get_card_data(datapoint, `right-${task_id}`);
      $("#right-inner").append(this.card_template.render(data));

      // Setup the callbacks
      data.captions.forEach((caption) => {
        let step_id = caption.step_id;
        if (step_id && caption.has_sub_steps) {
          $(`#right-${task_id}-caption-${step_id}`).click(() => {
            let subtask_datapoint = new Datapoint(task_id, step_id, parent_datapoint);
            this.visualize(subtask_datapoint, dataset);
          });
        }
      });
    });

    // Setup a scroll callback
    let draw = () => {
      let svg_elem = $("#line-canvas");
      let svg_x = svg_elem.position().left;
      let svg_y = svg_elem.position().top;

      // Get d3 svg and clear the canvas
      let svg = d3.select("#line-canvas");
      svg.selectAll('*').remove();

      // Get left element
      let left_elem = $(`#left-caption-${step_id} .card-section-caption-anchor-circle`);
      let left_elem_position = left_elem.position();
      let left_x = left_elem_position.left - svg_x + 16;
      let left_y = left_elem_position.top - svg_y + 6;
      predictions.forEach((p) => {
        let right_elem = $(`#right-${p[0]}-card .card-left-anchor`);
        let right_elem_position = right_elem.position();
        let right_x = right_elem_position.left - svg_x + 16;
        let right_y = right_elem_position.top - svg_y + 6;

        // Draw line
        svg
          .append('line')
          .style("stroke", "red")
          .style("stroke-width", 2)
          .attr("x1", left_x)
          .attr("y1", left_y)
          .attr("x2", right_x)
          .attr("y2", right_y);

        // Draw a text
        let text_y = right_y > left_y ? right_y + 20 : right_y - 10;
        svg
          .append("text")
          .text(`${p[1]}`.substring(0, 7))
          .style("font-size", "18px")
          .style("font-weight", "bold")
          .style("fill", "red")
          .attr("x", right_x - 85)
          .attr("y", text_y);
      });
    };
    $("#right").unbind("scroll").scroll(draw);
    $("#left").unbind("scroll").scroll(draw);
    draw();
  }
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
        return {name: this.category_list[c]};
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

class Datapoint {
  constructor(task_id, step_id, previous_datapoint) {
    this.task_id = `${task_id}`;
    this.step_id = step_id;
    this.previous_datapoint = previous_datapoint;
  }
}
