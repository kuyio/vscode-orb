const vscode = require('vscode');

const orb_regex = /{{.*}}|{%.*%}|{!--.*--}/;
const orb_opener_regex = /{{|{%|{!--/;
const orb_closer_regex = /}}|%}|--}/;

const orb_blocks = [
  ['{{', '}}'],
  ['{%', '%}'],
  ['{!--', '--}']
];

// On activation, register the cycleTags command
function activate (context) {
  console.log('Congratulations, your extension "ruby-orb" is now active!');

  const disposable = vscode.commands.registerCommand('ruby-orb.cycleTags', function () {
    let editor = vscode.window.activeTextEditor;
    if (editor) {
      cycleTags(editor);
    }
  });

  context.subscriptions.push(disposable);
}
exports.activate = activate;

function deactivate () {
}
exports.deactivate = deactivate;

// Discover the ORB tags surrounding the given text
function findSurroundingTags (text) {
  return [text.match(orb_opener_regex)[0], text.match(orb_closer_regex)[0]];
}

// Surround the given text with the next ORB tags
function insertORBTags (text) {
  return `${orb_blocks[0][0]} ${text} ${orb_blocks[0][1]}`;
}

// Replace surrounding ORB tags with the next ORB tags
function replaceORBTags (text) {
  let tags = findSurroundingTags(text);
  let next_tags = getNextORBTags(tags);
  return text.replace(tags[0], next_tags[0]).replace(tags[1], next_tags[1]);
}

// Cycle the ORB tags surrounding the current selection
function getNextORBTags (tags) {
  let tags_str = JSON.stringify(tags);
  for (let i = 0; i < orb_blocks.length; i++) {
    if (JSON.stringify(orb_blocks[i]) == tags_str) {
      if (i + 1 >= orb_blocks.length) {
        return orb_blocks[0];
      } else {
        return orb_blocks[i + 1]
      }
    }
  }

  return orb_blocks[0]
}

// Find the current selection range in the editor
function getSelectionRange (selection, editor) {
  let line = editor.document.lineAt(selection.start);
  let selected_text = editor.document.getText(selection);
  let new_selection = new vscode.Selection(selection.start, selection.end);
  let start_position = new_selection.start;
  let end_position = new_selection.end;
  let opener_position = [];
  let closer_position = [];

  while (start_position.character > line.firstNonWhitespaceCharacterIndex) {
    start_position = new vscode.Position(line.lineNumber, new_selection.start.character - 1);
    new_selection = new vscode.Selection(start_position, end_position);

    if (editor.document.getText(new_selection).match(orb_opener_regex)) {
      opener_position.push(start_position);
      break;
    }
  }
  while (end_position.character < line.range.end.character) {
    end_position = new vscode.Position(line.lineNumber, new_selection.end.character + 1);
    new_selection = new vscode.Selection(start_position, end_position);
    if (editor.document.getText(new_selection).match(orb_closer_regex)) {
      closer_position.push(end_position);
      break;
    }
  }

  if (opener_position.length > 0 && closer_position.length > 0) {
    return new vscode.Range(new_selection.start, new_selection.end);
  } else if (selection.isEmpty && editor.document.getText(selection).trim().length === 0 && line.isEmptyOrWhitespace) {
    start_position = new vscode.Position(selection.start.line, line.firstNonWhitespaceCharacterIndex);
    end_position = line.range.end;
    return new vscode.Range(start_position, end_position);
  }

  return new vscode.Range(selection.start, selection.end);
}

// Main command to cycle the ORB tags surrounding the current selection
function cycleTags (editor) {
  let selections_map = {};
  let new_selections = [];
  let line_offset = 0;
  let selections = editor.selections.filter(function (selection) { return selection.isSingleLine });

  // Push selections to selections_map grouped by line
  selections.forEach(function (selection) {
    return selections_map[selection.start.line] ? selections_map[selection.start.line].push(selection) : selections_map[selection.start.line] = [selection];
  });

  // Perform the edit
  editor.edit(function (editBuilder) {
    for (let key in selections_map) {
      if (selections_map.hasOwnProperty(key)) {
        line_offset = 0;
        // Order selections by ltr position
        selections_map[key] = selections_map[key].sort(function (first, second) { return first.end.isBefore(second.start) ? -1 : 1; });

        selections_map[key].forEach(function (selection) {
          let selectedRange = getSelectionRange(selection, editor);
          let selected_text = editor.document.getText(selectedRange);
          let new_text;
          let new_selection;
          if (selected_text.match(orb_regex)) {
            new_text = replaceORBTags(selected_text);
          } else {
            new_text = insertORBTags(selected_text);
          }
          let delta = new_text.length - selected_text.length;
          if (selected_text.trim().length == 0) {
            new_selection = new vscode.Selection(selection.start.line, selection.end.character + delta - 3, selection.end.line, selection.end.character + delta - 3);
          } else {
            new_selection = new vscode.Selection(selection.start.line, selection.start.character + line_offset, selection.end.line, selection.end.character + line_offset + delta);
          }
          new_selections.push(new_selection);
          line_offset += delta;
          editBuilder.replace(selectedRange, new_text);
        });
      }
    }
  });
  editor.selections = new_selections;
}