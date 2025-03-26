import { db } from '../lib/database.lib.js';
import Constants from '../lib/constants.lib.js';
import { report } from 'process';

export default class ReportsV2M {
  // General report functions
  // Get a report by ID
  static getReport = async (reportID) => {
    try {
      const report = await db.dbReports().findOne({ reportID }, { projection: Constants.DEFAULT_PROJECTION });
      return report;
    } catch (error) {
      throw new Error('Error getting report from DB: ' + error.message);
    }
  };
  // Get all reports of a certain type for an organization
  static getReports = async (organizationID, type, processor) => {
    try {
      const reports = await db.dbReports().find(
        processor ? { organizationID, processor } : { organizationID, type },
        { projection: Constants.DEFAULT_PROJECTION }
      ).toArray();
      return reports;
    } catch (error) {
      throw new Error('Error getting reports from DB: ' + error.message);
    }
  };
  // Get all reports for an organization by month
  static getProcessorReportsByMonth = async (organizationID, monthYear) => {
    try {
      const reports = await db.dbReports().find(
        {
          organizationID,
          type: 'processor',
          month: monthYear
        }, { projection: Constants.DEFAULT_PROJECTION }).toArray();
      return reports;
    } catch (error) {
      throw new Error('Error getting reports from DB: ' + error.message);
    }
  };
  // Get all reports for an organization
  static getAllReports = async (organizationID) => {
    try {
      const reports = await db.dbReports().find({ organizationID }, { projection: Constants.DEFAULT_PROJECTION }).toArray();
      return reports;
    } catch (error) {
      throw new Error('Error getting all reports from DB: ' + error.message);
    }
  };
  // Update a report
  static updateReport = async (reportID, reportData) => {
    try {
      console.log("Model: Incoming report for update:", reportData);

      // Attempt to update the report
      const updatedReport = await db.dbReports().replaceOne({ reportID }, reportData);

      // Check if a report was matched and modified
      if (!updatedReport.matchedCount) {
        throw new Error(`No report found with reportID: ${reportID}`);
      }
      if (!updatedReport.modifiedCount) {
        throw new Error(`Report with reportID: ${reportID} found but no changes were made.`);
      }

      // Return the updated data
      return reportData;
    } catch (error) {
      // Log the error with additional context for debugging
      console.error(`Failed to update report with reportID: ${reportID}`, {
        reportID,
        reportData,
        error: error.message,
      });
      throw new Error(`Error updating report with reportID: ${reportID} - ${error.message}`);
    }
  };

  // Delete a report
  static deleteReport = async (reportID) => {
    try {
      const deletedReport = await db.dbReports().deleteOne({ reportID });
      if (!deletedReport.deletedCount) {
        throw new Error('Report not found for deletion');
      }
      return { message: 'Report successfully deleted' };
    } catch (error) {
      throw new Error('Error deleting report: ' + error.message);
    }
  };
  // AR report functions
  // get an AR report
  static getARReport = async (organizationID, monthYear) => {
    try {
      // Find the AR report for the given organization and month/year
      const arReport = await db.dbReports().findOne({
        organizationID,
        type: 'ar',
        month: monthYear
      }, { projection: Constants.DEFAULT_PROJECTION });

      return arReport; // Return the AR report (if exists)
    } catch (error) {
      throw new Error('Error getting AR report from DB: ' + error.message);
    }
  };



  // Agent report functions
  // Get an agent report
  static getAgentReport = async (organizationID, agentID, monthYear) => {
    try {
      return await db.dbReports().findOne({
        organizationID,
        type: 'agent',
        month: monthYear,
        agentID
      }, { projection: Constants.DEFAULT_PROJECTION });
    } catch (error) {
      throw new Error('Error getting agent report: ' + error.message);

    }
  };
  // Check if an agent report exists
  static agentReportExists = async (organizationID, agentID, monthYear) => {
    try {
      const existingReport = await db.dbReports().findOne({
        organizationID,
        agentID,
        type: 'agent',
        month: monthYear
      });
      return !!existingReport; // Return true if a report exists, false otherwise
    } catch (error) {
      throw new Error('Error checking if report exists: ' + error.message);
    }
  };

  // Processor report functions
  // Get a processor report
  static getProcessorReport = async (organizationID, processor, monthYear) => {
    try {
      // Find the AR report for the given organization and month/year
      const arReport = await db.dbReports().findOne({
        organizationID,
        processor,
        type: 'processor',
        month: monthYear
      }, { projection: Constants.DEFAULT_PROJECTION });

      return arReport; // Return the AR report (if exists)
    } catch (error) {
      throw new Error('Error getting AR report from DB: ' + error.message);
    }
  };
  // Check if a processor report exists
  static createReport = async (reportData) => {
    try {
      return db.dbReports().insertOne(reportData);
    } catch (error) {
      throw new Error('Error creating report: ' + error.message);
    }
  };

  // Proccessor Summary Report functions

  // Check if an processor summary report exists
  static processorSummaryReportExists = async (organizationID, monthYear) => {
    try {
      const existingReport = await db.dbReports().findOne({
        organizationID,
        type: 'processor summary',
        month: monthYear
      });
      return !!existingReport; // Return true if a report exists, false otherwise
    } catch (error) {
      throw new Error('Error checking if report exists: ' + error.message);
    }
  };

  static getProcessorSummaryReport = async (organizationID, monthYear) => {
    try {
      console.log('Model: Getting Processor Summary Report: ', organizationID, monthYear);
      const report = await db.dbReports().findOne({ organizationID, type: 'processor summary', month: monthYear });
      console.log('Processor Summary Report:', report);
      return report;
    } catch (error) {
      throw new Error('Error getting processor summary report: ' + error.message);
    };
  };

  // Proccessor Summary Report functions

  // Check if an bank summary report exists
  static bankSummaryReportExists = async (organizationID, monthYear) => {
    try {
      const existingReport = await db.dbReports().findOne({
        organizationID,
        type: 'processor summary',
        month: monthYear
      });
      return !!existingReport; // Return true if a report exists, false otherwise
    } catch (error) {
      throw new Error('Error checking if report exists: ' + error.message);
    }
  };

  static getBankSummaryReport = async (organizationID, monthYear) => {
    try {
      console.log('Model: Getting Bank Summary Report: ', organizationID, monthYear);
      const report = await db.dbReports().findOne({ organizationID, type: 'bank summary', month: monthYear });
      console.log('Bank Summary Report:', report);
      return report;
    } catch (error) {
      throw new Error('Error getting bank summary report: ' + error.message);
    };
  };


  // agent summary report functions
  // Check if an agent summary report exists
  static agentSummaryReportExists = async (organizationID, monthYear) => {
    try {
      const existingReport = await db.dbReports().findOne({ organizationID, type: 'agent summary', month: monthYear });
      return !!existingReport; // Return true if a report exists, false otherwise
    }
    catch (error) {
      throw new Error('Error checking if report exists: ' + error.message);
    }
  };

  // Get an agent summary report
  static getAgentSummaryReport = async (organizationID, monthYear) => {
    try {
      console.log('Model: Getting Agent Summary Report: ', organizationID, monthYear);
      const report = await db.dbReports().findOne({ organizationID, type: 'agent summary', month: monthYear });
      console.log('Agent Summary Report:', report);
      return report;
    } catch (error) {
      throw new Error('Error getting agent summary report: ' + error.message);
    }
  };


  // Utility functions
  // Get the next invoice number
  static invoiceNum = async (organizationID) => {
    try {
      const reports = await db.dbReports().find({ organizationID, type: 'ar' }).toArray();
      let invoiceNum = 0;
      reports.forEach(report => {
        invoiceNum += report.reportData.length;
      });
      return invoiceNum;
    } catch (error) {
      throw new Error('Error generating invoice number: ' + error.message);
    }
  };
  // Check if a report exists
  static reportExists = async (organizationID, processor, type, monthYear) => {
    try {
      const existingReport = await db.dbReports().findOne({
        organizationID,
        processor,
        type,
        month: monthYear
      });
      return !!existingReport; // Return true if a report exists, false otherwise
    } catch (error) {
      throw new Error('Error checking if report exists: ' + error.message);
    }
  };

}
