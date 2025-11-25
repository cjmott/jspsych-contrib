// Functions for different questions types

/*
Plan:
Only one function
Question-specific parameters include group, type of question
Overall parameters include randomize_within_groups (argument is list of groups to 
randomize within) and randomize_between_groups (argument is boolean)
Returns: HTML for each question, listeners for each question type, list with question order
(where question number is order in which question was written in function call) subject
to constraints above

Procedure:
1. Copy input list
2. Assign each element a number for its order
3. Loop over each question type, creating html, which is stored in object, and listener 
functions, where are stored in array for return
4. Separate list of objects by group, randomize between and within groups, and then rejoin
5. Extract html list and list of question numbers in new order
6. Join html list
7. Return html, list of question numbers, and listener list
*/

export function questionMultiChoice(questions, randomize_question_order = false) {
  let out = {};
  let plugin_id_name = `multi-choice`;

  let html = ``;
  // generate question order. this is randomized here as opposed to randomizing the order of trial.questions
  // so that the data are always associated with the same question regardless of order
  let question_order = [];
  for (let i = 0; i < questions.length; i++) {
    question_order.push(i);
  }
  if (randomize_question_order) {
    question_order = this.jsPsych.randomization.shuffle(question_order);
  }

  // add multiple-choice questions
  for (let i = 0; i < questions.length; i++) {
    // get question based on question_order
    let question = questions[question_order[i]];
    let question_id = question_order[i];

    // create question container
    let question_classes = [`${plugin_id_name}-question`];
    if (question.horizontal) {
      question_classes.push(`${plugin_id_name}-horizontal`);
    }

    let name;
    if (question.name == "") {
      name = "Q" + question_id;
    } else {
      name = question.name;
    }

    html += `<div id="${plugin_id_name}-${question_id}" class="${question_classes.join(
      " "
    )}" data-name="${name}">`;

    // add question text
    html += `<p class="${plugin_id_name}-text survey">${question.prompt}`;
    /* No stars next to required questions
        if (question.required) {
            html += "<span class='required'>*</span>";
        }
        */
    html += "</p>";

    // create option radio buttons
    for (var j = 0; j < question.options.length; j++) {
      // add label and question text
      var option_id_name = `${plugin_id_name}-option-${question_id}-${j}`;
      var input_name = `${plugin_id_name}-response-${question_id}`;
      var input_id = `${plugin_id_name}-response-${question_id}-${j}`;

      //var required_attr = question.required ? "required" : "";

      // add radio button container
      // Removed ${required_attr} from after value argument
      html += `
            <div id="${option_id_name}" class="${plugin_id_name}-option">
            <label class="${plugin_id_name}-text" for="${input_id}">
                <input type="radio" name="${input_name}" id="${input_id}" value="${question.options[j]}" />
                ${question.options[j]}
                </label>
            </div>`;
    }

    html += "</div>";
  }

  out["html"] = html;
  out["question_order"] = question_order;

  const multicheck = (display_element) => {
    let missing_requested = 0;
    let missing_required = 0;
    let obje = {};

    for (let i = 0; i < questions.length; i++) {
      let question = questions[question_order[i]];
      let question_id = question_order[i];

      let match = display_element.querySelector(`#${plugin_id_name}-${question_id}`);
      let val;

      if (match.querySelector("input[type=radio]:checked") !== null) {
        val = match.querySelector("input[type=radio]:checked").value;
      } else {
        val = "";
        if (question.required) {
          missing_required++;
        } else if (question.requested) {
          missing_requested++;
        }
      }

      let name = match.attributes["data-name"].value;
      obje[name] = val;
    }

    obje["missing_requested"] = missing_requested;
    obje["missing_required"] = missing_required;

    return obje;
  };

  out["function"] = multicheck;

  return out;
}

/*
questions_type: {
      type: ParameterType.STRING,
      default: "multi", // multi or slider
    },
    questions: {
      type: ParameterType.COMPLEX,
      array: true,
      nested: {
        // Question prompt.
        prompt: {
          type: ParameterType.HTML_STRING,
          default: undefined,
        },
        // Array of multiple choice options for this question.
        options: {
          type: ParameterType.STRING,
          array: true,
          default: undefined,
        },
        // Whether or not a response to this question must be given in order to continue.
        required: {
          type: ParameterType.BOOL,
          default: false,
        },
        // If true, then the question will be centered and options will be displayed horizontally.
        horizontal: {
          type: ParameterType.BOOL,
          default: false,
        },
        // Name of the question in the trial data. If no name is given, the questions are named Q0, Q1, etc.
        name: {
          type: ParameterType.STRING,
          default: "",
        },
      },
      default: [
        {
          name: "dummy",
          prompt: "dummy",
          options: ["dummy"],
        },
      ],
    },
    // If true, the display order of `questions` is randomly determined at the start of the trial. In the data object,
    // `Q0` will still refer to the first question in the array, regardless of where it was presented visually.
    randomize_question_order: {
      type: ParameterType.BOOL,
      default: false,
    },
    // If true, a participant who clicks "submit" without answering all the questions
    // is prompted to do so
    request_response: {
      type: ParameterType.BOOL,
      default: false,
    },
*/

export function questionMultiSlider(questions, randomize_question_order = false) {
  let out = {};
  let plugin_id_name = `multi-slider`;

  let html = ``;

  // generate question order. this is randomized here as opposed to randomizing the order of trial.questions
  // so that the data are always associated with the same question regardless of order
  var question_order = [];
  for (var i = 0; i < questions.length; i++) {
    question_order.push(i);
  }
  if (randomize_question_order) {
    question_order = this.jsPsych.randomization.shuffle(question_order);
  }

  for (var i = 0; i < questions.length; i++) {
    let question = questions[question_order[i]];
    let question_id = question_order[i];

    let name;
    if (question.name == "") {
      name = "Q" + question_id;
    } else {
      name = question.name;
    }

    if (question.prompt !== null) {
      html += question.prompt;
    }

    html += `<div id="${plugin_id_name}-${question_id}" 
        class="jspsych-slider-response-container" 
        data-name="${name}"
        style="position:relative; margin: 0 auto 3em auto; width:`;

    html += question.slider_width + "px;";

    html += '">';
    html +=
      '<input type="range" class="jspsych-slider" value="' +
      question.slider_start +
      '" min="' +
      question.min +
      '" max="' +
      question.max +
      '" step="' +
      question.step +
      '" style="width: 100%;" id="jspsych-canvas-slider-response-response"></input>';
    html += "<div>";
    for (var j = 0; j < question.labels.length; j++) {
      let width = 100 / (question.labels.length - 1);
      let left_offset = j * (100 / (question.labels.length - 1)) - width / 2;
      html +=
        '<div style="display: inline-block; position: absolute; left:' +
        left_offset +
        "%; text-align: center; width: " +
        width +
        '%;">';
      html += '<span style="text-align: center; font-size: 80%;">' + question.labels[j] + "</span>";
      html += "</div>";
    }
    //html += "</div>";
    html += "</div>";
    html += "</div>";
  }

  out["html"] = html;
  out["question_order"] = question_order;

  const createListeners = (display_element) => {
    let all_sliders = display_element.querySelectorAll(".jspsych-slider");

    all_sliders.forEach(function (slider) {
      slider.addEventListener("click", function () {
        slider.classList.add("clicked"); // record the fact that this slider has been clicked
      });
      slider.addEventListener("change", function () {
        slider.classList.add("clicked"); // record the fact that this slider has been changed
      });
    });
  };

  const multicheck = (display_element) => {
    let missing_requested = 0;
    let missing_required = 0;
    let obje = {};

    for (let i = 0; i < questions.length; i++) {
      let question = questions[question_order[i]];
      let question_id = question_order[i];
      let match = display_element.querySelector(`#${plugin_id_name}-${question_id}`);

      if (question.required) {
        let slider = match.querySelector("#jspsych-canvas-slider-response-response");
        if (!slider.classList.contains("clicked")) {
          missing_required++;
        }
      } else if (question.requested) {
        let slider = match.querySelector("#jspsych-canvas-slider-response-response");
        if (!slider.classList.contains("clicked")) {
          missing_requested++;
        }
      }

      let val = match.querySelector("#jspsych-canvas-slider-response-response").valueAsNumber;

      let name = match.attributes["data-name"].value;
      obje[name] = val;
    }

    obje["missing_requested"] = missing_requested;
    obje["missing_required"] = missing_required;

    return obje;
  };

  out["function"] = multicheck;
  out["listeners"] = createListeners;

  return out;
}

/* 
parameters: {
    /** The function to draw on the canvas. This function automatically takes a canvas element as its only argument, e.g. `function(c) {...}` or `function drawStim(c) {...}`, where `c` refers to the canvas element. Note that the stimulus function will still generally need to set the correct context itself, using a line like `let ctx = c.getContext("2d")`.
    stimulus: {
      type: ParameterType.FUNCTION,
      default: undefined,
    },
    /** Sets the minimum value of the slider. 
    min: {
      type: ParameterType.INT,
      default: 0,
    },
    /** Sets the maximum value of the slider 
    max: {
      type: ParameterType.INT,
      default: 100,
    },
    /** Sets the starting value of the slider 
    slider_start: {
      type: ParameterType.INT,
      default: 50,
    },
    /** Sets the step of the slider. This is the smallest amount by which the slider can change. 
    step: {
      type: ParameterType.INT,
      default: 1,
    },
    /** Labels displayed at equidistant locations on the slider. For example, two labels will be placed at the ends of the slider. Three labels would place two at the ends and one in the middle. Four will place two at the ends, and the other two will be at 33% and 67% of the slider width. 
    labels: {
      type: ParameterType.HTML_STRING,
      default: [],
      array: true,
    },
    // Set the width of the slider in pixels. If left null, then the width will be equal to the widest element in the display.
    slider_width: {
      type: ParameterType.INT,
      default: null,
    },
    // Label of the button to end the trial.
    button_label: {
      type: ParameterType.STRING,
      default: "Continue",
      array: false,
    },
    // If true, the participant must click the slider before clicking the continue button.
    require_movement: {
      type: ParameterType.BOOL,
      default: false,
    },
    // This string can contain HTML markup. Any content here will be displayed below the stimulus. The intention is that it can be used to provide a reminder about the action the participant is supposed to take (e.g., what question to answer).
    prompt: {
      type: ParameterType.HTML_STRING,
      default: null,
    },
    */
