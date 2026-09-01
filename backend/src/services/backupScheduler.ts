import { backupService } from './backupService';
import { BackupLog } from '../models';
import { Op } from 'sequelize';

export class BackupScheduler {
  private timer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  /**
   * Starts the background backup strategy evaluator.
   * Runs evaluation check every 30 minutes.
   */
  public start() {
    if (this.timer) return;

    console.log('[Backup Scheduler] Initialized automated database backup strategy daemon (Asia/Karachi timezone).');

    // Run initial check after 15 seconds of server startup
    setTimeout(() => {
      this.evaluateAndRunStrategy().catch((err) =>
        console.warn('[Backup Scheduler Error]:', err.message)
      );
    }, 15000);

    // Schedule evaluation check every 30 minutes
    this.timer = setInterval(() => {
      this.evaluateAndRunStrategy().catch((err) =>
        console.warn('[Backup Scheduler Error]:', err.message)
      );
    }, 30 * 60 * 1000);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Evaluates if a daily, weekly, or monthly backup is due according to the hospital retention strategy.
   */
  public async evaluateAndRunStrategy(): Promise<{ triggered: boolean; type?: string; message: string }> {
    if (this.isRunning) {
      return { triggered: false, message: 'Backup strategy evaluation already in progress.' };
    }

    this.isRunning = true;
    try {
      // Calculate current Pakistan Standard Time (PKT / UTC+5)
      const now = new Date();
      const pktDateStr = now.toLocaleDateString('en-US', { timeZone: 'Asia/Karachi' });
      const pktHours = parseInt(
        now.toLocaleTimeString('en-US', { timeZone: 'Asia/Karachi', hour12: false, hour: '2-digit' }),
        10
      );

      // Look back 20 hours for recent successful backups
      const twentyHoursAgo = new Date(Date.now() - 20 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Check if Daily backup has been taken today
      const recentDaily = await BackupLog.findOne({
        where: {
          backupType: 'daily',
          status: 'SUCCESS',
          completedAt: { [Op.gte]: twentyHoursAgo },
        },
      });

      // Check if Weekly backup taken this week
      const recentWeekly = await BackupLog.findOne({
        where: {
          backupType: 'weekly',
          status: 'SUCCESS',
          completedAt: { [Op.gte]: sevenDaysAgo },
        },
      });

      // Check if Monthly backup taken this month
      const recentMonthly = await BackupLog.findOne({
        where: {
          backupType: 'monthly',
          status: 'SUCCESS',
          completedAt: { [Op.gte]: thirtyDaysAgo },
        },
      });

      // 1. Monthly Backup Rule (First day of month OR no monthly backup in 30 days)
      if (!recentMonthly) {
        console.log('[Backup Strategy] Executing scheduled Monthly Database Archive...');
        const res = await backupService.createBackup({ type: 'monthly' });
        await backupService.cleanupOldBackups();
        return { triggered: true, type: 'monthly', message: res.message };
      }

      // 2. Weekly Backup Rule (Sunday OR no weekly backup in 7 days)
      if (!recentWeekly) {
        console.log('[Backup Strategy] Executing scheduled Weekly Database Archive...');
        const res = await backupService.createBackup({ type: 'weekly' });
        await backupService.cleanupOldBackups();
        return { triggered: true, type: 'weekly', message: res.message };
      }

      // 3. Daily Backup Rule (Nightly / every 20h window)
      if (!recentDaily) {
        console.log('[Backup Strategy] Executing scheduled Daily Hospital Database Snapshot...');
        const res = await backupService.createBackup({ type: 'daily' });
        await backupService.cleanupOldBackups();
        return { triggered: true, type: 'daily', message: res.message };
      }

      return {
        triggered: false,
        message: `Database backups are completely up to date (Daily: ${recentDaily ? recentDaily.completedAt : 'OK'}, Weekly: ${recentWeekly ? recentWeekly.completedAt : 'OK'}, Monthly: ${recentMonthly ? recentMonthly.completedAt : 'OK'}).`,
      };
    } catch (error: any) {
      console.error('[Backup Strategy Failure]:', error);
      return { triggered: false, message: `Strategy evaluation error: ${error.message}` };
    } finally {
      this.isRunning = false;
    }
  }
}

export const backupScheduler = new BackupScheduler();
