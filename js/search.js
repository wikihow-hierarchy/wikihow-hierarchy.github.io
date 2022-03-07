const MAX_COUNT = 1000;

function load_category_select(dataset) {
  let category_option_template = $.templates("#category-option");
  dataset.category_list.forEach((category_str, category_id) => {
    $("#category-select").append(category_option_template.render({
      id: category_id,
      name: category_str,
    }))
  });
}

function load_search_parameters() {
  let param = {search: null, category: null};
  let query_string = window.location.search;
  let url_params = new URLSearchParams(query_string);
  if (url_params.has("search")) {
    param.search = url_params.get("search").toLowerCase();
    $("#search-bar").val(param.search);
  }
  if (url_params.has("category")) {
    if (url_params.get("category") != "all") {
      param.category = parseInt(url_params.get("category"));
      $("#category-select").val(param.category);
    }
  }
  return param;
}

function search(parameters, dataset) {
  // Get template
  let task_card_template = $.templates("#task-card");

  // Get columns
  let columns = [
    $("#search-result-column-1"),
    $("#search-result-column-2"),
    $("#search-result-column-3"),
  ];
  let min_column = () => {
    let min_column_id = 0;
    let min_column_height = columns[0].height();
    for (let i = 1; i < 3; i++) {
      let column_height = columns[i].height();
      if (column_height < min_column_height) {
        min_column_id = i;
        min_column_height = column_height;
      }
    }
    return columns[min_column_id]
  };

  // Enter loop
  let count = 0;
  Object.entries(dataset.step_goals).forEach(([task_id, data]) => {
    // Check if this is a match
    if (parameters.category && data.category.indexOf(parameters.category) < 0) {
      return;
    }
    if (parameters.search && data.task.toLowerCase().indexOf(parameters.search) < 0) {
      return;
    }
    if (count >= MAX_COUNT) {
      return;
    }

    // Is a match, append the rendered html element to the minimum column
    min_column().append(task_card_template.render({
      task: data["task"],
      task_id: task_id,
      elem_id: `card-${task_id}`,
    }));

    // Increment the count
    count += 1;
  });

  // Set the search count
  $("#search-item-count").text(count);
  $("#search-message").attr("style", "display: block");
}

$(document).ready(function () {
  load_data(function (dataset) {
    load_category_select(dataset);
    let param = load_search_parameters();
    search(param, dataset);
  });
});
