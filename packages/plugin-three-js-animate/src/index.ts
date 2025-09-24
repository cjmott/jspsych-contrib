import { JsPsych, JsPsychPlugin, ParameterType, TrialType } from "jspsych";

import { World, endWorld } from "../js/World.js";
import { version } from "../package.json";

const info = <const>{
  name: "three-js-animate",
  version: version,
  parameters: {
    /**
     * An array of objects, each object represents a question that appears on the screen. Each object contains a prompt,
     * options, required, and horizontal parameter that will be applied to the question. See examples below for further
     * clarification.`prompt`: Type string, default value is *undefined*. The string is prompt/question that will be
     * associated with a group of options (radio buttons). All questions will get presented on the same page (trial).
     * `options`: Type array, defualt value is *undefined*. An array of strings. The array contains a set of options to
     * display for an individual question.`required`: Type boolean, default value is null. The boolean value indicates
     * if a question is required('true') or not ('false'), using the HTML5 `required` attribute. If this parameter is
     * undefined, the question will be optional. `horizontal`:Type boolean, default value is false. If true, then the
     * question is centered and the options are displayed horizontally. `name`: Name of the question. Used for storing
     * data. If left undefined then default names (`Q0`, `Q1`, `...`) will be used for the questions.
     */
    /** The list of arrays that show the location of entities at the beginning
     * and how they move over time
     */
    array_list: {
      type: ParameterType.COMPLEX,
      array: true,
      default: undefined,
    },
    /** A mapping of each number in the arrays above
     * to a type of entity, a name, a model, and animation labels
     */
    array_map: {
      type: ParameterType.COMPLEX,
      array: true,
      nested: {
        /* Number of the entity in the arrays. */
        number: {
          type: ParameterType.INT,
          default: undefined,
        },
        /* ground, obstacle, agent. */
        entity_type: {
          type: ParameterType.STRING,
          default: undefined,
        },
        /** Name to give item */
        name: {
          type: ParameterType.STRING,
          default: undefined,
        },
        /* Path to 3D model. IMPLEMENT MODEL ADJUSTMENTS? */
        model_path: {
          type: ParameterType.STRING,
          default: undefined,
        },
        /** Name of idle and walk animations. */
        idle: {
          type: ParameterType.STRING,
          default: "idle",
        },
        walk: {
          type: ParameterType.STRING,
          default: "walk",
        },
      },
    },
    /* Color (in RGB) for sidewalk or path to texture */
    sidewalk_type: {
      type: ParameterType.STRING,
      default: undefined,
    },
    /* Is this an animation-only trial or an interactive trial? */
    trial_type: {
      type: ParameterType.STRING,
      default: undefined,
    },
    interaction_info: {
      type: ParameterType.COMPLEX,
      nested: {
        /** Which character is controlled */
        control_character: {
          type: ParameterType.STRING,
          default: "A",
        },
        /** How many moves */
        moves: {
          type: ParameterType.INT,
          default: 1,
        },
      },
      default: {
        control_character: "A",
        moves: 1,
      },
    },
    actions: {
      type: ParameterType.COMPLEX,
      array: true,
      default: [
        [1, 0],
        [0, 1],
        [0, 0],
        [-1, 0],
        [0, -1],
      ],
    },
    /**  What animation controls to include: pause, reset, all
     * (will always include play */
    animation_controls: {
      type: ParameterType.STRING,
      default: "all",
    },
    /**  Whether to include camera controls */
    camera_controls: {
      type: ParameterType.BOOL,
      default: true,
    },
    /** Array that defines the size of the canvas element in pixels. First value is height, second value is width. */
    canvas_size: {
      type: ParameterType.INT,
      array: true,
      default: [250, 250],
    },
    /** HTML formatted string to display at the top of the page above all the questions. */
    preamble: {
      type: ParameterType.HTML_STRING,
      default: null,
    },
    /** Label of the button. */
    button_label: {
      type: ParameterType.STRING,
      default: "Continue",
    },
    /**
     * This determines whether or not all of the input elements on the page should allow autocomplete. Setting
     * this to true will enable autocomplete or auto-fill for the form.
     */
    autocomplete: {
      type: ParameterType.BOOL,
      default: false,
    },
    questions: {
      type: ParameterType.COMPLEX,
      default: {
        html: ``,
        question_order: [],
        function: () => null,
      },
    },
  },
  data: {
    /** An object containing the response for each question. The object will have a separate key (variable) for each question, with the first question in the trial being recorded in `Q0`, the second in `Q1`, and so on. The responses are recorded as integers, representing the position selected on the likert scale for that question. If the `name` parameter is defined for the question, then the response object will use the value of `name` as the key for each question. This will be encoded as a JSON string when data is saved using the `.json()` or `.csv()` functions. */
    response: {
      type: ParameterType.OBJECT,
    },
    /** The response time in milliseconds for the participant to make a response. The time is measured from when the questions first appear on the screen until the participant's response(s) are submitted. */
    rt: {
      type: ParameterType.INT,
    },
    /** An array with the order of questions. For example `[2,0,1]` would indicate that the first question was `trial.questions[2]` (the third item in the `questions` parameter), the second question was `trial.questions[0]`, and the final question was `trial.questions[1]`. This will be encoded as a JSON string when data is saved using the `.json()` or `.csv()` functions. */
    question_order: {
      type: ParameterType.INT,
      array: true,
    },
  },
  // prettier-ignore
  citations: '__CITATIONS__',
};

type Info = typeof info;

const plugin_id_name = "jspsych-three-js-animate";

/**
 * **three-js-animate**
 *
 * The three-js-animate plugin creates a three-js scene as stimuli, which can display a preset animation,
 * allow for interaction, or both. Participants can give responses either interactively in the threeJs animation
 * or through one of the supported response options.
 *
 * @author Christian Mott
 */
class ThreeJsAnimatePlugin implements JsPsychPlugin<Info> {
  static info = info;

  constructor(private jsPsych: JsPsych) {}

  trial(display_element: HTMLElement, trial: TrialType<Info>) {
    const trial_form_id = `${plugin_id_name}_form`;

    let html = "";

    // Add canvas
    html = `<div id="${plugin_id_name}-wrapper" style="margin: 100px 0px;">`;
    html +=
      `<div id="${plugin_id_name}-stimulus">
      <canvas id="jspsych-canvas-stimulus" height="` +
      trial.canvas_size[0] +
      `" width="` +
      trial.canvas_size[1] +
      `"></canvas>
      </div>`;

    // inject CSS for trial
    html += `
    <style id="${plugin_id_name}-css">
      .${plugin_id_name}-question { margin-top: 2em; margin-bottom: 2em; text-align: left; }
      .${plugin_id_name}-text span.required {color: darkred;}
      .${plugin_id_name}-horizontal .${plugin_id_name}-text {  text-align: center;}
      .${plugin_id_name}-option { line-height: 2; }
      .${plugin_id_name}-horizontal .${plugin_id_name}-option {  display: inline-block;  margin-left: 1em;  margin-right: 1em;  vertical-align: top;}
      label.${plugin_id_name}-text input[type='radio'] {margin-right: 1em;}
      </style>`;

    // show preamble text
    if (trial.preamble !== null) {
      html += `<div id="${plugin_id_name}-preamble" class="${plugin_id_name}-preamble">${trial.preamble}</div>`;
    }

    // form element
    if (trial.autocomplete) {
      html += `<form id="${trial_form_id}">`;
    } else {
      html += `<form id="${trial_form_id}" autocomplete="off">`;
    }

    // Evaluate questions function
    let questions = trial.questions;
    console.log(questions);

    // Infer whether there are questions
    let include_questions = questions.html.length !== 0;

    if (include_questions) {
      html += questions.html;
    }

    // add submit button
    html += `<input type="submit" id="${plugin_id_name}-next" class="${plugin_id_name} jspsych-btn"${
      trial.button_label ? ' value="' + trial.button_label + '"' : ""
    } />`;
    html += "</form>";

    // Add html
    display_element.innerHTML = html;

    // Create event listeners for clicks, if any
    if (Object.keys(questions).includes("listeners")) {
      console.log("Adding listeners");
      questions.listeners(display_element);
    }

    // draw canvas
    let c = document.getElementById("jspsych-canvas-stimulus");
    c.style.display = "block";

    // run function on c based on inputs
    World(
      trial.array_list,
      trial.array_map,
      trial.sidewalk_type,
      trial.trial_type,
      trial.interaction_info,
      trial.actions,
      trial.animation_controls,
      trial.camera_controls,
      c
    );

    // Submit
    let submits = 0;
    const trial_form = display_element.querySelector<HTMLFormElement>(`#${trial_form_id}`);

    trial_form.addEventListener("submit", (event) => {
      event.preventDefault();
      // measure response time
      var endTime = performance.now();
      var response_time = Math.round(endTime - startTime);

      // create object to hold responses
      var question_data = {};

      // If there are questions, store them
      let missing_requested = 0;
      let missing_required = 0;

      if (include_questions) {
        let obje = questions.function(display_element);
        missing_requested = obje.missing_requested;
        missing_required = obje.missing_required;

        Object.assign(question_data, obje);
      }

      if (missing_required > 0) {
        alert(
          `There are ` +
            missing_required +
            ` required questions without an answer.\n
            Please answer all the questions before continuing.`
        );
      } else if (missing_requested > 0 && submits == 0) {
        alert(
          `There are ` +
            missing_requested +
            ` questions without an answer.\n
            Please consider answering all the questions before continuing.`
        );
        submits = 1;
      } else {
        // End world
        let response_inter = endWorld();
        console.log("END WORLD: ", response_inter);

        // Store interactive
        if (trial.trial_type == "interactive") {
          let obje = {};
          obje["QInt"] = response_inter;
          Object.assign(question_data, obje);
        }

        // save data
        let trial_data = {
          rt: response_time,
          response: question_data,
          question_order: questions.question_order,
        };

        // next trial
        this.jsPsych.finishTrial(trial_data);
      }
    });

    var startTime = performance.now();
  }

  simulate(
    trial: TrialType<Info>,
    simulation_mode,
    simulation_options: any,
    load_callback: () => void
  ) {
    if (simulation_mode == "data-only") {
      load_callback();
      this.simulate_data_only(trial, simulation_options);
    }
    if (simulation_mode == "visual") {
      this.simulate_visual(trial, simulation_options, load_callback);
    }
  }

  private create_simulation_data(trial: TrialType<Info>, simulation_options) {
    const question_data = {};
    let rt = 1000;
    let questions = trial.question;

    for (const q of questions) {
      const name = q.name ? q.name : `Q${questions.indexOf(q)}`;
      question_data[name] = this.jsPsych.randomization.sampleWithoutReplacement(q.options, 1)[0];
      rt += this.jsPsych.randomization.sampleExGaussian(1500, 400, 1 / 200, true);
    }

    const default_data = {
      response: question_data,
      rt: rt,
      question_order: trial.randomize_question_order
        ? this.jsPsych.randomization.shuffle([...Array(questions.length).keys()])
        : [...Array(questions.length).keys()],
    };

    const data = this.jsPsych.pluginAPI.mergeSimulationData(default_data, simulation_options);

    this.jsPsych.pluginAPI.ensureSimulationDataConsistency(trial, data);

    return data;
  }

  private simulate_data_only(trial: TrialType<Info>, simulation_options) {
    const data = this.create_simulation_data(trial, simulation_options);

    this.jsPsych.finishTrial(data);
  }

  private simulate_visual(trial: TrialType<Info>, simulation_options, load_callback: () => void) {
    const data = this.create_simulation_data(trial, simulation_options);

    const display_element = this.jsPsych.getDisplayElement();

    let questions = trial.question;

    this.trial(display_element, trial);
    load_callback();

    const answers = Object.entries(data.response);
    for (let i = 0; i < answers.length; i++) {
      this.jsPsych.pluginAPI.clickTarget(
        display_element.querySelector(
          `#${plugin_id_name}-response-${i}-${questions[i].options.indexOf(answers[i][1])}`
        ),
        ((data.rt - 1000) / answers.length) * (i + 1)
      );
    }

    this.jsPsych.pluginAPI.clickTarget(
      display_element.querySelector(`#${plugin_id_name}-next`),
      data.rt
    );
  }
}

export default ThreeJsAnimatePlugin;

/* 
Inputs to function:

array_list (list of arrays of world stages)
array_map (giving model paths for all obstacles and agents)
{number: from arrays,
entity_type: obstacle, agent;
name: for calling,
model_path: for loading
idle: 'idle',
walk: 'walk'
}
sidewalk: color or file path,
trial_type: animate or interactive
animation_controls: ["pause", "reset", "all"],
camera_controls: true
*/

/*
TO DO:
- Submit button does not work, so cannot continue to next trial or end DONE
- Only control character A. Allow users to specify which characters are 
controllable and the order in which they move. HALF DONE
- Fix initial animation skipping MOSTLY FIXED
- Store clicks for interactive DONE
- Implement non-interactive DONE

- Interactive mode where people plan out path
- Implement choices for controls
- Implement choices for camera
- Implement slider question in addition to multiple choice
*/
