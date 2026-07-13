const nodemailer = require('nodemailer');
const config = require('../config/env');
const logger = require('../utils/logger');
const { EMAIL_SETTINGS } = require('../utils/constants');

class NotificationService {
  constructor() {
    this.transporter = null;
    this.initializeEmailTransporter();
  }

  /**
   * Initialize email transporter
   */
  initializeEmailTransporter() {
    if (config.EMAIL_HOST && config.EMAIL_USER && config.EMAIL_PASS) {
      this.transporter = nodemailer.createTransporter({
        host: config.EMAIL_HOST,
        port: config.EMAIL_PORT,
        secure: config.EMAIL_PORT === 465,
        auth: {
          user: config.EMAIL_USER,
          pass: config.EMAIL_PASS
        }
      });

      logger.info('Email transporter initialized');
    } else {
      logger.warn('Email configuration not found, email notifications disabled');
    }
  }

  /**
   * Send email notification
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} text - Email text content
   * @param {string} html - Email HTML content
   */
  async sendEmail(to, subject, text, html = null) {
    if (!this.transporter) {
      logger.warn('Email transporter not available');
      return false;
    }

    try {
      const mailOptions = {
        from: `${EMAIL_SETTINGS.FROM_NAME} <${EMAIL_SETTINGS.FROM_EMAIL}>`,
        to,
        subject,
        text,
        html: html || text
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${to}: ${result.messageId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send email to ${to}: ${error.message}`);
      return false;
    }
  }

  /**
   * Send payment notification
   * @param {object} transaction - Transaction object
   * @param {object} recipient - Recipient user object
   */
  async sendPaymentNotification(transaction, recipient) {
    const subject = 'Payment Received - BPI';
    const text = `
      Hello ${recipient.name},
      
      You have received a payment of ₹${transaction.amount} from ${transaction.fromHandle}.
      
      Transaction Details:
      - From: ${transaction.fromHandle}
      - Amount: ₹${transaction.amount}
      - Memo: ${transaction.memo || 'No memo'}
      - Transaction Hash: ${transaction.transactionHash}
      
      Best regards,
      BPI Team
    `;

    return await this.sendEmail(recipient.email, subject, text);
  }

  /**
   * Send payment request notification
   * @param {object} request - Payment request object
   * @param {object} fromUser - User who should pay
   */
  async sendPaymentRequestNotification(request, fromUser) {
    const subject = 'Payment Request - BPI';
    const text = `
      Hello ${fromUser.name},
      
      ${request.toHandle} has requested a payment of ₹${request.amount} from you.
      
      Request Details:
      - From: ${request.toHandle}
      - Amount: ₹${request.amount}
      - Memo: ${request.memo || 'No memo'}
      
      Please log in to your BPI account to approve or decline this request.
      
      Best regards,
      BPI Team
    `;

    return await this.sendEmail(fromUser.email, subject, text);
  }

  /**
   * Send welcome email
   * @param {object} user - User object
   */
  async sendWelcomeEmail(user) {
    const subject = 'Welcome to BPI - Blockchain Payment Interface';
    const text = `
      Hello ${user.name},
      
      Welcome to BPI! Your account has been successfully created.
      
      Account Details:
      - BPI Handle: ${user.bpiHandle}
      - Bank: ${user.bankCode}
      - Initial Balance: ₹${user.balance}
      
      You can now start sending and receiving payments using your BPI handle.
      
      Best regards,
      BPI Team
    `;

    return await this.sendEmail(user.email, subject, text);
  }

  /**
   * Send transaction confirmation email
   * @param {object} transaction - Transaction object
   * @param {object} user - User object
   * @param {string} type - 'sent' or 'received'
   */
  async sendTransactionConfirmation(transaction, user, type) {
    const subject = `Payment ${type.charAt(0).toUpperCase() + type.slice(1)} - BPI`;
    const text = `
      Hello ${user.name},
      
      Your payment has been ${type} successfully.
      
      Transaction Details:
      - ${type === 'sent' ? 'To' : 'From'}: ${type === 'sent' ? transaction.toHandle : transaction.fromHandle}
      - Amount: ₹${transaction.amount}
      - Memo: ${transaction.memo || 'No memo'}
      - Transaction Hash: ${transaction.transactionHash}
      - Status: ${transaction.status}
      
      Best regards,
      BPI Team
    `;

    return await this.sendEmail(user.email, subject, text);
  }

  /**
   * Send push notification (placeholder for future implementation)
   * @param {string} userId - User ID
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {object} data - Additional data
   */
  async sendPushNotification(userId, title, body, data = {}) {
    // Placeholder for push notification implementation
    // This could integrate with Firebase Cloud Messaging or similar service
    logger.info(`Push notification to user ${userId}: ${title} - ${body}`);
    
    // For now, just log the notification
    return true;
  }

  /**
   * Send SMS notification (placeholder for future implementation)
   * @param {string} phoneNumber - Phone number
   * @param {string} message - SMS message
   */
  async sendSMSNotification(phoneNumber, message) {
    // Placeholder for SMS notification implementation
    // This could integrate with Twilio or similar service
    logger.info(`SMS to ${phoneNumber}: ${message}`);
    
    // For now, just log the SMS
    return true;
  }
}

module.exports = new NotificationService();
