/**
 * server/mailer.js — Layanan Notifikasi Email untuk Sigma Nursery
 * Mengirimkan notifikasi email instan saat catatan perbaikan / feedback baru masuk.
 */

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Cek apakah konfigurasi SMTP sudah diisi lengkap
 */
function isConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_USER !== 'your-email@gmail.com'
  );
}

/**
 * Membuat transporter Nodemailer
 */
function getTransporter() {
  if (!isConfigured()) return null;

  const cleanPass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
  const isGmail = process.env.SMTP_HOST?.includes('gmail');

  if (isGmail) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: cleanPass
      }
    });
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: cleanPass
    }
  });
}

/**
 * Format HTML template email notifikasi
 */
function generateEmailHTML(note) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SMTP_USER || 'admin@socfindo.co.id';
  const siteUrl = process.env.APP_URL || 'http://localhost:3000';
  const authorEmail = note.email ? `<a href="mailto:${note.email}" style="color:#116834; text-decoration:none;">${note.email}</a>` : '<span style="color:#94a3b8;">Tidak dicantumkan</span>';

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notifikasi Catatan Perbaikan Baru — Sigma Nursery</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;" cellspacing="0" cellpadding="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #116834 0%, #15803d 100%); padding: 24px 30px; text-align: left;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.2px; color: #bbf7d0; text-transform: uppercase;">PT. IndoWebhost Kreasi - Proyek SIGMA Rubber Nursery</div>
                    <div style="font-size: 20px; font-weight: 800; color: #ffffff; margin-top: 4px;">🌿 Catatan Perbaikan Baru #${String(note.number).padStart(2, '0')}</div>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="background-color: rgba(255,255,255,0.2); color: #ffffff; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">Status: ${note.status || 'Baru'}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 28px 30px;">
              <p style="margin: 0 0 18px 0; font-size: 15px; color: #334155; line-height: 1.5;">
                Halo Tim / Developer SIGMA Rubber Nursery,
              </p>
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.6;">
                Seorang pengguna / pelanggan telah mengirimkan catatan perbaikan baru pada prototype aplikasi:
              </p>

              <!-- Meta Box -->
              <table role="presentation" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 22px;" cellspacing="0" cellpadding="12">
                <tr>
                  <td width="35%" style="font-size: 13px; color: #64748b; font-weight: 600; border-bottom: 1px solid #edf2f7;">👤 Pembuat</td>
                  <td style="font-size: 13px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #edf2f7;">${note.author || '-'} <span style="font-weight: 400; color: #64748b;">(${note.creatorRole || 'Customer'})</span></td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #64748b; font-weight: 600; border-bottom: 1px solid #edf2f7;">✉️ Email Pembuat</td>
                  <td style="font-size: 13px; color: #0f172a; border-bottom: 1px solid #edf2f7;">${authorEmail}</td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #64748b; font-weight: 600; border-bottom: 1px solid #edf2f7;">📱 Halaman Terkait</td>
                  <td style="font-size: 13px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #edf2f7;"><span style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${note.pageTitle || note.page}</span> <span style="font-size: 11px; color:#64748b;">(${note.page})</span></td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #64748b; font-weight: 600; border-bottom: 1px solid #edf2f7;">📅 Tanggal & Waktu</td>
                  <td style="font-size: 13px; color: #0f172a; border-bottom: 1px solid #edf2f7;">${note.createdAt}</td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #64748b; font-weight: 600;">📍 Koordinat Marker</td>
                  <td style="font-size: 13px; color: #0f172a;">X: ${note.marker?.x ?? 50}%, Y: ${note.marker?.y ?? 40}%</td>
                </tr>
              </table>

              <!-- Description Box -->
              <div style="margin-bottom: 24px;">
                <div style="font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">📝 Isi Catatan / Masukan:</div>
                <div style="background-color: #f0fdf4; border-left: 4px solid #116834; padding: 14px 16px; border-radius: 0 8px 8px 0; font-size: 14px; color: #14532d; line-height: 1.6; font-style: italic;">
                  "${note.description}"
                </div>
              </div>

              <!-- Action Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 26px; text-align: center;">
                <tr>
                  <td align="center">
                    <a href="${siteUrl}/#${note.page || '/home'}" target="_blank" style="display: inline-block; background-color: #116834; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: 700; box-shadow: 0 2px 6px rgba(17,104,52,0.3);">
                      Lihat di Aplikasi SIGMA Rubber Nursery &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 18px 30px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
              Email otomatis dari <strong>SIGMA Rubber Nursery Prototype</strong> &bull; PT. IndoWebhost Kreasi<br>
              Notifikasi dikirim ke: <span style="color:#64748b;">${adminEmail}</span>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Mengirim notifikasi email untuk catatan baru
 */
export async function sendNewNoteNotification(note) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SMTP_USER;
  const fromEmail = process.env.MAIL_FROM || `"SIGMA Rubber Nursery System" <${process.env.SMTP_USER || 'noreply@sigmanursery.com'}>`;
  const subject = `[SIGMA Rubber Nursery] Catatan Perbaikan Baru #${String(note.number).padStart(2, '0')} dari ${note.author} (${note.pageTitle || note.page})`;

  // Jika SMTP belum disetting, log preview simulasi email ke konsol secara rapi
  if (!isConfigured() || !adminEmail) {
    console.log('\n========================================================');
    console.log('📧 [SIMULASI EMAIL NOTIFIKASI CATATAN BARU]');
    console.log('--------------------------------------------------------');
    console.log(`Kepada     : ${adminEmail || '(Belum diset di .env: ADMIN_NOTIFICATION_EMAIL)'}`);
    console.log(`Subjek     : ${subject}`);
    console.log(`Pembuat    : ${note.author} (${note.creatorRole})`);
    console.log(`Email      : ${note.email || '-'}`);
    console.log(`Halaman    : ${note.pageTitle} (${note.page})`);
    console.log(`Deskripsi  : "${note.description}"`);
    console.log('--------------------------------------------------------');
    console.log('💡 Tip: Untuk mengirim ke email asli, atur SMTP di file .env');
    console.log('========================================================\n');

    return {
      sent: false,
      simulated: true,
      message: 'SMTP belum dikonfigurasi di .env. Notifikasi email disimulasikan ke konsol server.',
      previewSubject: subject
    };
  }

  const transporter = getTransporter();
  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to: adminEmail,
      subject: subject,
      html: generateEmailHTML(note)
    });

    console.log(`[Mailer] Notifikasi email berhasil terkirim ke ${adminEmail}. MessageID: ${info.messageId}`);
    return {
      sent: true,
      simulated: false,
      messageId: info.messageId,
      recipient: adminEmail
    };
  } catch (err) {
    console.error('[Mailer] Gagal mengirim email notifikasi:', err);
    return {
      sent: false,
      simulated: false,
      error: err.message
    };
  }
}

/**
 * Format HTML template email pembaruan status
 */
function generateStatusUpdateHTML(note, oldStatus, newStatus) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SMTP_USER || 'admin@socfindo.co.id';
  const siteUrl = process.env.APP_URL || 'http://localhost:3000';
  const authorEmail = note.email ? `<a href="mailto:${note.email}" style="color:#116834; text-decoration:none;">${note.email}</a>` : '<span style="color:#94a3b8;">Tidak dicantumkan</span>';

  const getStatusColor = (st) => {
    if (st === 'Selesai') return { bg: '#dcfce7', text: '#15803d', border: '#86efac' };
    if (st === 'Dalam Proses') return { bg: '#fef3c7', text: '#b45309', border: '#fde68a' };
    return { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' };
  };

  const oldC = getStatusColor(oldStatus);
  const newC = getStatusColor(newStatus);

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pembaruan Status Catatan — SIGMA Rubber Nursery</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;" cellspacing="0" cellpadding="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #116834 0%, #15803d 100%); padding: 24px 30px; text-align: left;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.2px; color: #bbf7d0; text-transform: uppercase;">PT. IndoWebhost Kreasi - Proyek SIGMA Rubber Nursery</div>
                    <div style="font-size: 20px; font-weight: 800; color: #ffffff; margin-top: 4px;">🔄 Status Catatan #${String(note.number).padStart(2, '0')} Diperbarui</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 28px 30px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.5;">
                Halo Tim & Pembuat Catatan,
              </p>
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.6;">
                Status catatan perbaikan pada prototype aplikasi <strong>SIGMA Rubber Nursery</strong> telah diperbarui:
              </p>

              <!-- Status Change Highlight Box -->
              <div style="text-align: center; margin-bottom: 22px; padding: 18px; background-color: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0;">
                <div style="font-size: 11px; color: #64748b; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 10px;">PERUBAHAN STATUS PERBAIKAN:</div>
                <table role="presentation" align="center" cellspacing="0" cellpadding="0">
                  <tr>
                    <td>
                      <span style="display: inline-block; background-color: ${oldC.bg}; color: ${oldC.text}; border: 1px solid ${oldC.border}; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 700;">
                        ${oldStatus || 'Baru'}
                      </span>
                    </td>
                    <td style="padding: 0 12px; font-size: 18px; color: #94a3b8; font-weight: bold;">
                      &rarr;
                    </td>
                    <td>
                      <span style="display: inline-block; background-color: ${newC.bg}; color: ${newC.text}; border: 1px solid ${newC.border}; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 800; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                        ${newStatus}
                      </span>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Meta Box -->
              <table role="presentation" width="100%" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 22px;" cellspacing="0" cellpadding="12">
                <tr>
                  <td width="35%" style="font-size: 13px; color: #64748b; font-weight: 600; border-bottom: 1px solid #edf2f7;">👤 Pembuat</td>
                  <td style="font-size: 13px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #edf2f7;">${note.author || '-'} <span style="font-weight: 400; color: #64748b;">(${note.creatorRole || 'Customer'})</span></td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #64748b; font-weight: 600; border-bottom: 1px solid #edf2f7;">📱 Halaman</td>
                  <td style="font-size: 13px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #edf2f7;"><span style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${note.pageTitle || note.page}</span></td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #64748b; font-weight: 600; border-bottom: 1px solid #edf2f7;">📅 Waktu Pembaruan</td>
                  <td style="font-size: 13px; color: #0f172a; border-bottom: 1px solid #edf2f7;">${new Date().toLocaleDateString('id-ID')} - ${new Date().toLocaleTimeString('id-ID')}</td>
                </tr>
              </table>

              <!-- Description Box -->
              <div style="margin-bottom: 24px;">
                <div style="font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">📝 Isi Catatan Terkait:</div>
                <div style="background-color: #f8fafc; border-left: 4px solid #116834; padding: 14px 16px; border-radius: 0 8px 8px 0; font-size: 14px; color: #334155; line-height: 1.6;">
                  "${note.description}"
                </div>
              </div>

              <!-- Action Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 26px; text-align: center;">
                <tr>
                  <td align="center">
                    <a href="${siteUrl}/#${note.page || '/home'}" target="_blank" style="display: inline-block; background-color: #116834; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: 700; box-shadow: 0 2px 6px rgba(17,104,52,0.3);">
                      Buka Aplikasi SIGMA Rubber Nursery &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 18px 30px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
              Email otomatis dari <strong>SIGMA Rubber Nursery Prototype</strong> &bull; PT. IndoWebhost Kreasi<br>
              Notifikasi dikirim ke: <span style="color:#64748b;">${adminEmail}</span>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Mengirim notifikasi email pembaruan status catatan
 */
export async function sendStatusUpdateNotification(note, oldStatus, newStatus) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SMTP_USER;
  const fromEmail = process.env.MAIL_FROM || `"SIGMA Rubber Nursery System" <${process.env.SMTP_USER || 'noreply@sigmanursery.com'}>`;
  const subject = `[SIGMA Rubber Nursery] Status Catatan #${String(note.number).padStart(2, '0')} Diperbarui: ${newStatus} (${note.pageTitle || note.page})`;

  // Kumpulkan daftar penerima: admin + pembuat catatan (jika mencantumkan email)
  const recipients = [adminEmail].filter(Boolean);
  if (note.email && note.email.includes('@') && !recipients.includes(note.email)) {
    recipients.push(note.email);
  }

  if (!isConfigured() || !adminEmail) {
    console.log('\n========================================================');
    console.log('📧 [SIMULASI EMAIL PEMBARUAN STATUS CATATAN]');
    console.log('--------------------------------------------------------');
    console.log(`Kepada     : ${recipients.join(', ')}`);
    console.log(`Subjek     : ${subject}`);
    console.log(`Catatan    : #${note.number} (${note.author})`);
    console.log(`Perubahan  : ${oldStatus} ➔ ${newStatus}`);
    console.log('========================================================\n');

    return {
      sent: false,
      simulated: true,
      message: 'SMTP belum dikonfigurasi. Notifikasi email status disimulasikan.',
      previewSubject: subject
    };
  }

  const transporter = getTransporter();
  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to: recipients.join(', '),
      subject: subject,
      html: generateStatusUpdateHTML(note, oldStatus, newStatus)
    });

    console.log(`[Mailer] Notifikasi pembaruan status (${oldStatus} -> ${newStatus}) berhasil dikirim ke ${recipients.join(', ')}. MessageID: ${info.messageId}`);
    return {
      sent: true,
      simulated: false,
      messageId: info.messageId,
      recipients
    };
  } catch (err) {
    console.error('[Mailer] Gagal mengirim email pembaruan status:', err);
    return {
      sent: false,
      simulated: false,
      error: err.message
    };
  }
}

/**
 * Menguji koneksi dan mengirim email percobaan
 */
export async function sendTestEmail(targetEmail) {
  const recipient = targetEmail || process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SMTP_USER;
  const sampleNote = {
    number: 99,
    createdAt: new Date().toLocaleDateString('id-ID'),
    author: 'Admin Tester',
    creatorRole: 'QA Engineer',
    email: recipient,
    page: '/home',
    pageTitle: 'Beranda',
    description: 'Ini adalah pesan email pengujian untuk memvalidasi bahwa sistem notifikasi email Sigma Nursery berfungsi dengan sempurna.',
    status: 'Baru',
    marker: { x: 50.0, y: 50.0 }
  };

  return sendNewNoteNotification(sampleNote);
}
