/**
 * Optional backend for the wedding RSVP form.
 * Deploy this file as a Google Apps Script web app that executes as the owner.
 * The Drive folder ID below comes from the folder link in content.docx.
 */
const RSVP_FOLDER_ID = 'https://drive.google.com/drive/folders/1G8f_wZZsQrlMPmbcRN47xF4OuoplB_Zc';

function doGet() {
  return ContentService.createTextOutput('RSVP endpoint is running.').setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    const rawPayload = e && e.parameter && e.parameter.payload;
    if (!rawPayload) {
      return jsonResponse({ ok: false, message: 'Missing payload' });
    }
    if (rawPayload.length > 30000) {
      return jsonResponse({ ok: false, message: 'Payload too large' });
    }

    const payload = JSON.parse(rawPayload);
    const guestName = String(payload.guestName || '').trim();
    const answers = Array.isArray(payload.answers) ? payload.answers : [];
    if (!guestName || answers.length !== 8) {
      return jsonResponse({ ok: false, message: 'Invalid RSVP payload' });
    }

    const safeName = guestName
      .replace(/[\\/:*?"<>|\u0000-\u001F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 90) || 'Гость';

    const submittedAt = String(payload.submittedAt || new Date().toISOString());
    const lines = [
      'Свадебная анкета',
      'Имя файла: ' + safeName,
      'Отправлено: ' + submittedAt,
      ''
    ];

    answers.forEach((item, index) => {
      const question = String((item && item.question) || ('Вопрос ' + (index + 1))).trim();
      const answerValue = item ? item.answer : '';
      const answer = Array.isArray(answerValue)
        ? answerValue.map((v) => String(v)).join(', ')
        : String(answerValue == null ? '' : answerValue).trim();
      lines.push(question + ':');
      lines.push(answer || '—');
      lines.push('');
    });

    const folder = DriveApp.getFolderById(RSVP_FOLDER_ID);
    folder.createFile(safeName + '.txt', lines.join('\n'), MimeType.PLAIN_TEXT);
    return jsonResponse({ ok: true, message: 'RSVP saved' });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, message: 'Could not save RSVP' });
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}


