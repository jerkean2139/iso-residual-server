import { parseFile } from '../utils/fileParser.utilV2.js';
import AgentReportUtil from '../utils/agentReport.util.js';
import Report from '../classes/report.class.js';
import ProcessorReportUtil from '../utils/processorReport.util.js';
import ArReportUtil from '../utils/arReport.util.js';
import ReportsV2M from '../models/reportsV2.model.js';
import AgentsModel from '../models/agents.model.js';
import ProcessorSummaryUtil from '../utils/processorSummary.util.js';
import BankSummaryUtil from '../utils/bankSummary.util.js';
import AgentSummaryUtil from '../utils/agentSummary.util.js';
import InvoicesModel from '../models/invoices.model.js';

export default class ReportsV2Coor {

  // General report functions
    // Get a report by ID
  static getReport = async (reportID) => {
    try {
      return await ReportsV2M.getReport(reportID);
    } catch (error) {
      throw new Error('Error getting report: ' + error.message);
    }
  };

    // Get all reports of a certain type for an organization
  static getReports = async (organizationID, type) => {
    try {
      return await ReportsV2M.getReports(organizationID, type);
    } catch (error) {
      throw new Error('Error getting reports: ' + error.message);
    }
  };

    // Get all reports for an organization
  static getAllReports = async (organizationID) => {
    try {
      return await ReportsV2M.getAllReports(organizationID);
    } catch (error) {
      throw new Error('Error getting all reports: ' + error.message);
    }
  };

    // delete a report
  static deleteReport = async (reportID) => {
    try {
      return await ReportsV2M.deleteReport(reportID);
    } catch (error) {
      throw new Error('Error deleting report: ' + error.message);
    }
  };

  // Update a report in the coordinator
static updateReport = async (reportID, report) => {
  try {
      // Log the initiation of the update process with context
      console.log(`Coordinator: Initiating update for reportID: ${reportID}`, { reportID, report });

      // Call the model to update the report
      const updatedReport = await ReportsV2M.updateReport(reportID, report);

      // Log successful update
      console.log(`Coordinator: Successfully updated report with reportID: ${reportID}`);

      return updatedReport;
  } catch (error) {
      // Log the error with additional context
      console.error(`Coordinator: Failed to update report with reportID: ${reportID}`, {
          reportID,
          report,
          error: error.message,
      });

      // Throw a descriptive error message
      throw new Error(`Coordinator: Error updating report with reportID: ${reportID} - ${error.message}`);
  }
};

  // AR report functions
    // Create an AR report
  static createArReport = async (organizationID, processor, fileBuffer, mimetype, monthYear) => {
    try {
      const reports = [];
      let response = [];
      // Parse the file
      const csvData = await parseFile(fileBuffer, mimetype, processor);
      if (!csvData || csvData.length === 0) {
        throw new Error('Parsed data is empty. Please check the input file.');
      }
      if (processor === 'PAAY' && !csvData[0].MID) {
        throw new Error('PAAY report is missing required columns. Please check the input file.');
      } else if (processor === 'accept.blue' && !csvData[0].Month) {
        throw new Error('Accept.Blue report is missing required columns. Please check the input file.');
      };

      // Check if a report already exists for this organization, processor, type, and month/year
      const billingReportExists = await ReportsV2M.reportExists(organizationID, processor, 'billing', monthYear);
      if (billingReportExists) {
        throw new Error(`A ${processor} Billing Report for ${monthYear} already exists.`);
      }
      const billingReport = await ArReportUtil.buildBillingReport(organizationID, processor, monthYear, csvData);

      reports.push(billingReport);
      // Check if an AR report already exists for this month and organization
      const arReport = await ReportsV2M.getARReport(organizationID, monthYear);
      const invoiveNum = await InvoicesModel.getInvoiceNum(organizationID);
      const invoiceCount = invoiveNum.number;

      if (arReport) {
        // Update the existing AR report with the new data
        const result = await ArReportUtil.updateARReport(processor, invoiceCount, arReport, csvData);
        const updatedReport = result.arReport;
        const updatedInvoiceCount = result.invoiceCount;
        await ReportsV2M.updateReport(updatedReport.reportID, updatedReport);
        await InvoicesModel.updateInvoiceNum(organizationID, updatedInvoiceCount);
        response[result.type] = updatedReport;
      } else {
        // Create a new AR report (e.g., for accept.blue)
        const result = await ArReportUtil.buildARReport(organizationID, processor, monthYear, invoiceCount, csvData);
        const newReport = result.arReport;
        const newInvoiceCount = result.invoiceCount;
        await InvoicesModel.updateInvoiceNum(organizationID, newInvoiceCount);
        reports.push(newReport);
      }
      for (const report of reports) {
        const result = await ReportsV2M.createReport(report);
        if (result.acknowledged) {
          response.push(report);
        }
      }
      return response;
    } catch (error) {
      throw new Error('Error creating billing report: ' + error.message);
    }
  };

  // Processor report functions
    // Create a processor report
  static createProcessorReport = async (organizationID, processor, fileBuffer, mimetype, monthYear) => {
    try {
      // Parse the file
      const csvData = await parseFile(fileBuffer, mimetype, processor);
      const agents = await AgentsModel.getAgents(organizationID);
      if (!csvData || csvData.length === 0) {
        throw new Error('Parsed data is empty. Please check the input file.');
      }
      // Check if a report already exists for this organization, processor, type, and month/year
      let reportExists;
      // Check if building Line Item Deductions report
      if (processor === 'Rectangle Health' || processor === 'Hyfin') {
        reportExists = await ReportsV2M.reportExists(organizationID, 'Line Item Deductions', 'processor', monthYear);
        if (reportExists) {
          const report = await ReportsV2M.getProcessorReport(organizationID, 'Line Item Deductions', monthYear);
          // Check if the processor is already in the report
          if (report.processors.includes(processor)) {
            throw new Error(`A ${processor} Report for ${monthYear} already was already added to the Line Item Deductions Processor Report.`);
          };
          // Update the existing report with the new processor data
          const updatedReport = await ProcessorReportUtil.updateProcessorReport(processor, report, agents, csvData);
          // Update the report in the database
          const result = await ReportsV2M.updateReport(report.reportID, updatedReport);
          // Check if the report was updated successfully
          if (result.reportID) {
            return updatedReport;
          };
        } else {
          // Create a new Line Item Deductions report
          const report = await ProcessorReportUtil.buildProcessorReport(organizationID, processor, monthYear, agents, csvData);
          // Create the report in the database
          const result = await ReportsV2M.createReport(report);
          // Check if the report was created successfully
          if (result.acknowledged) {
            return report;
          } else {
            throw new Error('Error creating report: ' + result.message);
          }
        };
      };
      // Check if stanaard processor report exists
      reportExists = await ReportsV2M.reportExists(organizationID, processor, 'processor', monthYear);
      // if report exists,throw error
      if (reportExists) {
        throw new Error(`A ${processor} Processor Report for ${monthYear} already exists.`);
      };
      // Build the processor report
      const report = await ProcessorReportUtil.buildProcessorReport(organizationID, processor, monthYear, agents, csvData);
      // Create the report in the database
      const result = await ReportsV2M.createReport(report);
      // Check if the report was created successfully
      if (result.acknowledged) {
        return report;
      } else {
        throw new Error('Error creating report: ' + result.message);
      }
    } catch (error) {
      throw new Error('Error creating processor report: ' + error)
    }
  };

  // Agent report functions
    // Build an agent report
  static buildAgentReport = async (organizationID, agentID, monthYear) => {
    try {
      const agent = await AgentsModel.getAgent(organizationID, agentID);
      if (!agent) {
        throw new Error('Agent not found');
      };
      // get processor reports
      const processorReports = await ReportsV2M.getProcessorReportsByMonth(organizationID, monthYear);
      if (!processorReports || processorReports.length === 0) {
        throw new Error('No processor reports found for this month/year.');
      };
      // build report 
      const agentReport = AgentReportUtil.buildAgentReport(organizationID, monthYear, agent, processorReports);
      return agentReport;
    } catch (error) {
      throw new Error('Error creating agent report: ' + error.message);
    }
  };

    // Get an agent report
  static getAgentReport = async (organizationID, agentID, monthYear) => {
    try {
      return await ReportsV2M.getAgentReport(organizationID, agentID, monthYear);
      
    } catch (error) {
      throw new Error('Error getting agent report: ' + error.message);
      
    }
  };

    // Create an agent report
  static createAgentReport = async (organizationID, agentID, body) => {
    try {
      const monthYear = body.monthYear;
      const reportData = body.reportData;
      const reportExists = await ReportsV2M.agentReportExists(organizationID, agentID, monthYear);
      if (reportExists) {
        throw new Error(`An Agent Report for ${monthYear} already exists.`);
      };
      const agentReport = new Report(organizationID, '', 'agent', monthYear, reportData);
      if (body.approved === true) {
      agentReport.approved = body.approved;
      }
      agentReport.agentID = agentID; // Add the agent ID to the report
      const result = await ReportsV2M.createReport(agentReport);
      if (result.acknowledged) {
        return result;
      } else {
        throw new Error('Error  report: ' + result.message);
      }
    } catch (error) {
      throw new Error('Error creating agent report: ' + error.message);
    }
  };

  // Agent Summary report functions
   // build an agent summary report
   static buildAgentSummaryReport = async (organizationID, monthYear) => {
    try {
      console.log(`Starting generation of agent summary report for Organization: ${organizationID}, Month-Year: ${monthYear} in the coordinator`);
  
      // Fetch agents for the organization
      console.log(`Fetching agents for Organization: ${organizationID}`);
      const agents = await AgentsModel.getAgents(organizationID);
      if (!agents || agents.length === 0) {
        console.error(`No agents found for Organization: ${organizationID}`);
        throw new Error('No agents found for this organization.');
      }
      console.log(`Successfully fetched ${agents.length} agents`);
  
      // Fetch processor reports for the given month/year
      console.log(`Fetching processor reports for Organization: ${organizationID}, Month-Year: ${monthYear}`);
      const processorReports = await ReportsV2M.getProcessorReportsByMonth(organizationID, monthYear);
      console.log('Processor Reports:', processorReports);
      if (!processorReports || processorReports.length === 0) {
        console.error(`No processor reports found for Organization: ${organizationID}, Month-Year: ${monthYear}`);
        throw new Error('No processor reports found for this month/year.');
      }
      console.log(`Successfully fetched ${processorReports.length} processor reports`);
  
      // Build the agent summary report
      console.log(`Building agent summary report for Organization: ${organizationID}, Month-Year: ${monthYear}`);
      const agentSummaryReport = AgentSummaryUtil.buildAgentSummaryReport(organizationID, monthYear, agents, processorReports);
      console.log('Successfully built agent summary report');
  
      return agentSummaryReport;
    } catch (error) {
      console.error('Error building agent summary report:', error.message);
      throw new Error('Error building agent summary report: ' + error.message);
    }
  };
  

    // Get an agent summary report
  static getAgentSummaryReport = async (organizationID, monthYear) => {
    try {
      return await ReportsV2M.getAgentSummaryReport(organizationID, monthYear);
    } catch (error) {
      throw new Error('Error getting agent summary report: ' + error.message);
    }
  };

    // Create an agent summary report
  static createAgentSummaryReport = async (organizationID, body) => {
    try {
      
      const monthYear = body.monthYear;
      const reportData = body.reportData;
      console.log('Coordinator: Creating Agent Summary Report: ', organizationID, monthYear, reportData);
      const reportExists = await ReportsV2M.agentSummaryReportExists(organizationID, monthYear);

      if (reportExists) {
        throw new Error(`An Agent Report for ${monthYear} already exists.`);
      };
      const agentReport = new Report(organizationID, '', 'agent summary', monthYear, reportData);
      if (body.approved === true) {
      agentReport.approved = body.approved;
      }
      const result = await ReportsV2M.createReport(agentReport);
      console.log('Coordinator: Agent Summary Report Result: ', result);
      if (result.acknowledged) {
        return result;
      } else {
        throw new Error('Error  report: ' + result.message);
      }
      
    } catch (error) {
      throw new Error('Error creating agent summary report: ' + error.message);
      
    }
  };

  // Processor Summary report functions
// build a processor summary report
static buildProcessorSummaryReport = async (organizationID, monthYear) => {
  try {
    // Retrieve processor reports for the specified organization and month/year
    const reports = await ReportsV2M.getProcessorReportsByMonth(organizationID, monthYear);
    if (!reports || reports.length === 0) {
      throw new Error('No processor reports found for this month/year.');
    }

    // Use the utility function to build the processor summary report
    const processorSummaryReport = ProcessorSummaryUtil.createProcessorReport(organizationID, monthYear, reports);
    // You can either save the summary report to the database here or return it
    return processorSummaryReport;

  } catch (error) {
    throw new Error('Error building processor summary report: ' + error.message);
  }
};

  
      // Get a processor summary report
  static getProcessorSummaryReport = async (organizationID, monthYear) => {
    try {
      console.log('Coordinator: Getting Processor Summary Report: ', organizationID, monthYear);
      return await ReportsV2M.getProcessorSummaryReport(organizationID, monthYear);
    } catch (error) {
      throw new Error('Error getting processor summary report: ' + error.message);
    }
  };

      // Create a processor summary report
  static createProcessorSummaryReport = async (organizationID, body) => {
    try {
      const monthYear = body.monthYear;
      const reportData = body.reportData;
      const reportExists = await ReportsV2M.processorSummaryReportExists(organizationID, monthYear);
      if (reportExists) {
        throw new Error(`A Processor Summary Report for ${monthYear} already exists.`);
      };
      const processorSummaryReport = new Report(organizationID, '', 'processor summary', monthYear, reportData);
      if (body.approved === true) {
      processorSummaryReport.approved = body.approved;
      }
      const result = await ReportsV2M.createReport(processorSummaryReport);
      if (result.acknowledged) {
        return result;
      } else {
        throw new Error('Error creating processor summary report: ' + result.message);
      }
    } catch (error) {
      throw new Error('Error creating processor summary report: ' + error.message);
    }
  };

    // Bank Summary report functions
// build a bank summary report
static buildBankSummaryReport = async (organizationID, monthYear) => {
  try {
    // Retrieve bank reports for the specified organization and month/year
    const reports = await ReportsV2M.getProcessorReportsByMonth(organizationID, monthYear);
    if (!reports || reports.length === 0) {
      throw new Error('No Processor reports found for this month/year.');
    }

    // Use the utility function to build the bank summary report
    console.log('Building Bank Summary Report');
    const bankSummaryReport = BankSummaryUtil.buildBankSummaryReport(organizationID, monthYear, reports);
    console.log('Bank Summary Report:', bankSummaryReport)
    // You can either save the summary report to the database here or return it
    return bankSummaryReport;

  } catch (error) {
    throw new Error('Error building bank summary report: ' + error.message);
  }
};

  
      // Get a bank summary report
  static getBankSummaryReport = async (organizationID, monthYear) => {
    try {
      console.log('Coordinator: Getting Bank Summary Report: ', organizationID, monthYear);
      return await ReportsV2M.getBankSummaryReport(organizationID, monthYear);
    } catch (error) {
      throw new Error('Error getting bank summary report: ' + error.message);
    }
  };

      // Create a bank summary report
  static createBankSummaryReport = async (organizationID, body) => {
    try {
      console.log('Coordinator: Creating Bank Summary Report: ', organizationID, body);
      const monthYear = body.monthYear;
      const reportData = body.reportData;
      const reportExists = await ReportsV2M.bankSummaryReportExists(organizationID, monthYear);
      if (reportExists) {
        throw new Error(`A Bank Summary Report for ${monthYear} already exists.`);
      };
      const bankSummaryReport = new Report(organizationID, '', 'bank summary', monthYear, reportData);
      if (body.approved === true) {
      bankSummaryReport.approved = body.approved;
      }
      const result = await ReportsV2M.createReport(bankSummaryReport);
      console.log('Coordinator: Bank Summary Report Result: ', result);
      if (result.acknowledged) {
        return result;
      } else {
        throw new Error('Error creating bank summary report: ' + result.message);
      }
    } catch (error) {
      throw new Error('Error creating bank summary report: ' + error.message);
    }
  };
}
