const LINE_CANVAS_PADDING = 20;

$(document).ready(function () {
  load_data(function (dataset) {
    let visualizer = new Visualizer();
    initialize(visualizer, dataset);
  });
});

function initialize(visualizer, dataset) {
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

  // Remove the loading mask
  $("#loading-mask").removeClass("active");
  setTimeout(() => $("#loading-mask").attr("style", "display: none"), 200);
}

class Visualizer {
  constructor() {
    this.card_template = $.templates("#card");
    this.history_card_template = $.templates("#history-card");
  }

  visualize(datapoint, dataset) {
    $("#middle").unbind("scroll");
    $("#right").unbind("scroll");
    $("#curr-task-id").text(datapoint.task_id);

    // Push history
    var new_url = new URL(window.location.href);
    new_url.search = `?task_id=${datapoint.task_id}`;
    window.history.replaceState({ path: new_url.href }, "", new_url.href);

    // Get the data
    let data = dataset.get_card_data(datapoint, "middle");

    // Render the object onto the page
    $("#middle-inner").html(this.card_template.render(data));

    // Setup the callbacks
    data.captions.forEach((caption) => {
      let step_id = caption.step_id;
      if (step_id && caption.has_sub_steps) {
        $(`#middle-caption-${step_id}`).click(() => {
          let new_datapoint = new Datapoint(datapoint.task_id, step_id, datapoint.parent_datapoint);
          this.visualize(new_datapoint, dataset);
        });
      }
    });

    // If the step id is present, directly visualize that step
    if (datapoint.step_id != null) {
      this.visualize_step(datapoint, datapoint.step_id, dataset);
    } else {
      $("#right-inner").html("");
      $("#right-line-canvas").attr("style", "display: none");
    }

    // If the previous datapoint is present, visualize the parent
    if (datapoint.parent_datapoint != null) {
      this.visualize_parent(datapoint.parent_datapoint, dataset);
    } else {
      $("#left-inner").html("");
      $("#left-line-canvas").attr("style", "display: none");
    }
  }

  visualize_parent(parent_datapoint, dataset) {
    // Open the left canvas
    $("#left-line-canvas").attr("style", "display: block");

    // Clear the left
    $("#left-inner").html("");

    // Render the left
    let data = dataset.get_card_data(parent_datapoint, "left");
    $("#left-inner").html(this.history_card_template.render(data));

    // Setup on click callback
    $(`#left-card`).click(() => {
      this.visualize(parent_datapoint, dataset);
    });

    // Setup on scroll callback
    let draw = () => {
      let svg_elem = $("#left-line-canvas");
      let svg_x = svg_elem.position().left;
      let svg_y = svg_elem.position().top;

      // Get d3 svg and clear the canvas
      let svg = d3.select("#left-line-canvas");
      svg.selectAll('*').remove();

      // Get middle element position
      let middle_elem = $("#middle-card .card-left-anchor");
      let middle_elem_position = middle_elem.position();
      let middle_x = middle_elem_position.left - svg_x + 6 + LINE_CANVAS_PADDING;
      let middle_y = middle_elem_position.top - svg_y + 6;

      // Get left element position
      let left_elem = $("#left-card .card-section-caption-anchor-circle");
      let left_elem_position = left_elem.position();
      let left_x = left_elem_position.left - svg_x + 6 + LINE_CANVAS_PADDING;
      let left_y = left_elem_position.top - svg_y + 6;

      // Draw line
      svg
        .append("line")
        .style("stroke", "rgba(0, 0, 0, 0.5)")
        .style("stroke-width", 2)
        .attr("x1", left_x)
        .attr("y1", left_y)
        .attr("x2", middle_x)
        .attr("y2", middle_y);

      // If there is one more level of parent, draw an additional line from left of the screen
      let base_svg = d3.select("#base-canvas");
      base_svg.selectAll("*").remove();
      if (parent_datapoint.parent_datapoint != null) {
        base_svg.selectAll("*").remove();
        let edge_x = 0;
        let left_card = $("#left-card");
        let left_card_left_x = left_card.position().left + 1;
        let left_card_middle_y = left_card.position().top + left_card.outerHeight() / 2 + 10;
        base_svg
          .append("line")
          .style("stroke", "rgba(0, 0, 0, 0.2)")
          .style("stroke-width", 1)
          .attr("x1", edge_x)
          .attr("y1", left_card_middle_y)
          .attr("x2", left_card_left_x)
          .attr("y2", left_card_middle_y);
      }
    };
    $("#middle").scroll(draw);
    draw();
  }

  visualize_step(parent_datapoint, step_id, dataset) {
    // Open the right canvas
    $("#right-line-canvas").attr("style", "display: block");

    // Push history
    var new_url = new URL(window.location.href);
    new_url.search = `?task_id=${parent_datapoint.task_id}&step_id=${step_id}`;
    window.history.replaceState({ path: new_url.href }, '', new_url.href);

    // Highlight the step in the left
    $(`#middle-caption-${step_id}`).addClass("active").siblings().removeClass("active");

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
      let svg_elem = $("#right-line-canvas");
      let svg_x = svg_elem.position().left;
      let svg_y = svg_elem.position().top;

      // Get d3 svg and clear the canvas
      let svg = d3.select("#right-line-canvas");
      svg.selectAll('*').remove();

      // Get middle element
      let middle_elem = $(`#middle-caption-${step_id} .card-section-caption-anchor-circle`);
      let middle_elem_position = middle_elem.position();
      let middle_x = middle_elem_position.left - svg_x + 6 + LINE_CANVAS_PADDING;
      let middle_y = middle_elem_position.top - svg_y + 6;
      predictions.forEach((p) => {
        let right_elem = $(`#right-${p[0]}-card .card-left-anchor`);
        let right_elem_position = right_elem.position();
        let right_x = right_elem_position.left - svg_x + 6 + LINE_CANVAS_PADDING;
        let right_y = right_elem_position.top - svg_y + 6;

        // Draw line
        svg
          .append("line")
          .style("stroke", "red")
          .style("stroke-width", 2)
          .attr("x1", middle_x)
          .attr("y1", middle_y)
          .attr("x2", right_x)
          .attr("y2", right_y);

        // Draw a text
        let text_y = right_y > middle_y ? right_y + 20 : right_y - 10;
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
    $("#right").scroll(draw);
    $("#middle").scroll(draw);
    draw();
  }
}

class Datapoint {
  constructor(task_id, step_id, parent_datapoint) {
    this.task_id = `${task_id}`;
    this.step_id = step_id;
    this.parent_datapoint = parent_datapoint;
  }
}
