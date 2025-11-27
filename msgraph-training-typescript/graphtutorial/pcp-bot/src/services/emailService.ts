import nodemailer from 'nodemailer';

export interface EmailConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    to: string;
}

class EmailService {
    private transporter: nodemailer.Transporter | null = null;
    private config: EmailConfig | null = null;

    initialize(config: EmailConfig) {
        this.config = config;
        this.transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: false, // true for 465, false for other ports
            auth: {
                user: config.user,
                pass: config.password
            },
            tls: {
                ciphers: 'SSLv3'
            }
        });
        console.log('✅ Email service initialized');
    }

    async sendBlockerEmail(data: {
        userName: string;
        userEmail?: string;
        workItemId: string;
        workItemTitle: string;
        blockerDescription: string;
    }): Promise<void> {
        if (!this.transporter || !this.config) {
            console.warn('⚠️ Email service not configured - skipping email');
            return;
        }

        try {
            const mailOptions = {
                from: this.config.user,
                to: this.config.to,
                subject: `🚨 BLOCKER: Work Item #${data.workItemId} - ${data.workItemTitle}`,
                html: `
                    <h2>Blocker Reported</h2>
                    <p><strong>Reported by:</strong> ${data.userName} ${data.userEmail ? `(${data.userEmail})` : ''}</p>
                    <p><strong>Work Item:</strong> #${data.workItemId} - ${data.workItemTitle}</p>
                    <p><strong>Blocker Description:</strong></p>
                    <blockquote>${data.blockerDescription}</blockquote>
                    <hr>
                    <p><small>This is an automated notification from PCP Bot</small></p>
                `
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Blocker email sent: ${info.messageId}`);
        } catch (error) {
            console.error('❌ Error sending blocker email:', error);
            throw error;
        }
    }
}

// Singleton instance
const emailService = new EmailService();

export function initEmailService(config: EmailConfig) {
    emailService.initialize(config);
}

export function getEmailService(): EmailService {
    return emailService;
}
