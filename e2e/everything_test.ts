import { expect } from 'chai';

Feature('everything');

const [user1name, user2name] = ['User 1', 'User 2'];

type Mood = 'positive' | 'negative' | 'confused';

interface Note {
  author: string;
  mood: Mood;
  text: string;
  finalText?: string;
  deleted?: boolean;
}

const notes: Note[] = [
  {author: user1name, mood: 'positive', text: 'I feel happy', deleted: true},
  {author: user1name, mood: 'positive', text: 'I got a new hit', finalText: 'I got a new hat'},
  {author: user1name, mood: 'negative', text: 'My shoes are too small'},
  {author: user1name, mood: 'confused', text: 'What am I doing here?'},

  {author: user2name, mood: 'positive', text: 'My keyboard is working again'},
  {author: user2name, mood: 'negative', text: 'It still sometimes gets stu'},
  {author: user2name, mood: 'confused', text: 'Will my keyboard work again one day?'},
];

Scenario('Test everything', async (I) => {
  // Log two users in

  I.amOnPage('/');
  identifyAs(I, user1name)

  const url = await I.grabCurrentUrl();
  const roomId = new URL(url).searchParams.get('id');
  expect(roomId).to.not.be.null;

  session(user2name, () => {
    I.amOnPage(url);
    identifyAs(I, user2name);
    iSeePeopleWaitingInRoom(I);
  });

  iSeePeopleWaitingInRoom(I);

  // Start retrospective

  I.click('$room-start');

  // Save some notes
  for (const note of notes.filter(n => n.author === user1name)) {
    saveAndCheckNote(I, note.mood, note.text);
  }

  session(user2name, () => {
    for (const note of notes.filter(n => n.author === user2name)) {
      saveAndCheckNote(I, note.mood, note.text);
    }
  });

  // Edit a note
  editNoteAndSave(I, notes[1].text, notes[1].finalText)

  // Edit & Cancel a note
  editNoteAndCancel(I, notes[2].text)

  // Delete a note
  notes.filter((n) => n.deleted).forEach((n) => editNoteAndDelete(I, n.text))

  // Close the retro
  I.click('$room-close');

  // Expect to see all the notes and their author
  const checkNoteState = () => {
    for (const note of notes) {
      if (!note.deleted) {
        iSeeNote(I, note.mood, (note.finalText || note.text), note.author);
      } else {
        I.dontSee(note.finalText || note.text)
      }
    }
  }
  checkNoteState()
  session(user2name, () => {
    checkNoteState()
  });
});

function identifyAs(I: CodeceptJS.I, name: string) {
  I.fillField('$login-nickname', name);
  I.click('$login-submit');
}

function locateParticipant(name: string) {
  return locate('$room-participant-list-item').withText(name);
}

function iSeePeopleWaitingInRoom(I: CodeceptJS.I) {
  for (const name of [user1name, user2name]) {
    I.see(name, locateParticipant(name));
  }
}

function columnTestId(mood: Mood) {
  return '$room-column-' + mood;
}

function saveNote(I: CodeceptJS.I, mood: Mood, text: string) {
  I.fillField(locate('$noteeditor-text').inside(columnTestId(mood)), text);
  I.click(locate('$noteeditor-save').inside(columnTestId(mood)));
}

function noteLocator() {
  return locate({css: 'div.Note'});
}

function editNote(I: CodeceptJS.I, initialText: string, correctedText: string, buttonId: string) {
  const note = noteLocator().withText(initialText);
  I.click(locate('$noteeditor-edit').inside(note));
  I.fillField(locate('$noteeditor-text').inside(note), correctedText);
  I.click(locate(buttonId).inside(noteLocator().withText(correctedText)));
}

function editNoteAndSave(I: CodeceptJS.I, initialText: string, correctedText: string) {
  editNote(I, initialText, correctedText, '$noteeditor-save');
}

function editNoteAndCancel(I: CodeceptJS.I, initialText: string) {
  editNote(I, initialText, 'about anything', '$noteeditor-cancel');
}

function editNoteAndDelete(I: CodeceptJS.I, initialText: string) {
  editNote(I, initialText, 'about anything', '$noteeditor-delete');
}

function iSeeNote(I: CodeceptJS.I, mood: Mood, text: string, author?: string) {
  const l = noteLocator().inside(columnTestId(mood));
  I.see(text, l);

  if (author) {
    I.see(author, l)
  }
}

function saveAndCheckNote(I: CodeceptJS.I, mood: Mood, text: string) {
  saveNote(I, mood, text);
  iSeeNote(I, mood, text)
}
