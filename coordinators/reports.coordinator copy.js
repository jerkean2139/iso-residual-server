import fs from 'fs';
import csv from 'csv-parser';
import ReportsM from '../models/reports.model.js';
import Report from '../classes/report.class.js';
import ARRow from '../classes/arRow.class.js';



export default class ReportsCoor {
  static getReport = async (reportID) => {
    try {
      const report = await ReportsM.getReport(reportID);
      return report;
    } catch (error) {
      throw new Error('Error getting report: ' + error.message);
    }
  };

  static getReports = async (organizationID, type) => {
    try {
      const reports = await ReportsM.getReports(organizationID, type);
      return reports;
    } catch (error) {
      throw new Error('Error getting reports: ' + error.message);
    }
  };

  static getAllReports = async (organizationID) => {
    try {
      const reports = await ReportsM.getAllReports(organizationID);
      return reports;
    } catch (error) {
      throw new Error('Error getting all reports: ' + error.message);
    }
  };

  static buildBillReport = async (organizationID, processor, type, csvData) => {
    try {
      const arData = [];
      const keyMappings = {
        'Setup Fee ISO': { lineItemName: 'Merchant Setup', lineItemQuantity: 1 },
        'Monthly Gateway Fee ISO': { lineItemName: 'Merchant Monthly', lineItemQuantity: 1 },
      };
  
      csvData.forEach(async row => {
        Object.keys(row).forEach(async key => {
          if (keyMappings[key]) {
            const { lineItemName, lineItemQuantity } = keyMappings[key];
            const lineItemAmount = parseFloat(row[key].replace('$', ''));
            const newARRow = new ARRow(
              row['Name'],
              row['Agent Id'],
              await ReportsM.invoiceNum(row['Name'], processor, type), // Pass necessary parameters
              row['Month'],
              lineItemName,
              lineItemQuantity,
              lineItemAmount.toFixed(2), // Ensure two decimal places
              lineItemAmount.toFixed(2)  // Ensure two decimal places
            );
            arData.push(newARRow);
          }
        });
  
        const transactionCount = parseFloat(row['Transaction Count']);
        const transactionFeeAmount = (transactionCount * 0.2).toFixed(2); // Ensure two decimal places
        const transactionFeeRow = new ARRow(
          row['Name'],
          row['Agent Id'],
          await ReportsM.invoiceNum(row['Name'], processor, type), // Pass necessary parameters
          row['Month'],
          'TracerPay Transaction Fee',
          transactionCount,
          0.2,
          transactionFeeAmount
        );
        arData.push(transactionFeeRow);
      });
  
      const arReport = new Report(
        organizationID,
        processor,
        'ar',
        csvData[0]['Month'], // Assuming all rows have the same month
        arData
      );
  
      return await ReportsM.createReport(arReport);
    } catch (error) {
      throw new Error('Error building Bill Report: ' + error.message);
    }
  }
  

  static createReport = async (organizationID, processor, filePath) => {
    try {
      const csvData = await this.parseCSV(filePath);
      let type;
      let formattedMonthYear;
      let billingReport;

      if (!csvData[0].Month) {
        type = 'Merchant Report';
        const currentDate = new Date();
        let monthIndex = currentDate.getMonth(); // Get the current month (0-11)
        let year = currentDate.getFullYear(); // Get the current year

        if (monthIndex === 0) { // If the current month is January (0)
          monthIndex = 11; // Set to December of the previous year
          year -= 1; // Adjust the year to the previous year
        } else {
          monthIndex -= 1; // Simply go back one month
        }

        const monthNames = [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"
        ];

        const month = monthNames[monthIndex]; // Get the full month name
        formattedMonthYear = `${month} ${year}`; // Format as "July 2024"

      } else {
        type = 'billing';
        formattedMonthYear = csvData[0].Month; // Assuming Month is already formatted in the CSV
        billingReport = await this.buildBillReport(organizationID, processor, type, csvData);
      }

      // Check if a report already exists for this organization, processor, type, and month/year
      const reportExists = await ReportsM.reportExists(organizationID, processor, type, formattedMonthYear);
      if (reportExists) {
        throw new Error(`A ${organizationID} ${type} for ${formattedMonthYear} already exists.`);
      }

      const report = new Report(
        organizationID,
        processor,
        type,
        formattedMonthYear,
        csvData
      );
      const originalReport = await ReportsM.createReport(report);
      return [originalReport, billingReport];
    } catch (error) {
      throw new Error('Error creating report: ' + error.message);
    }
  };
  

    static parseCSV = (filePath) => {
    return new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          fs.unlinkSync(filePath); // Clean up the uploaded file
          resolve(results);
        })
        .on('error', (err) => {
          reject(new Error(`Error parsing CSV file: ${err.message}`));
        });
    });
  };


}
