import AgentsModel from '../models/agents.model.js';
import Agent from '../classes/agent.class.js';
import AgentsUtil from '../utils/agents.util.js';
import { parseFile } from '../utils/fileParser.util.js';

export default class AgentsCoordinator {

    static createAgent = async (organizationID, agent) => {
        try {
            const newAgent = new Agent(organizationID, agent.fName, agent.lName, agent.clients);
            const result = await AgentsModel.createAgent(newAgent);
            
            return { ...result, agentID: newAgent.agentID };
        } catch (error) {
            throw error;
        }
    };
    
    static reauditAgents = async (organizationID, agentsData) => {
        try {
            if (!agentsData || agentsData.length === 0) {
                throw new Error('No agents data provided for re-audit.');
            }
    
            // Get a list of all agents for an organization
            let agents = await AgentsModel.getAgents(organizationID);
    
            // Ensure agents is an array
            if (!Array.isArray(agents)) {
                agents = [];
            }
    
            // Use the utility to process the agents array for re-audit
            const { agentsArray, needsAudit, rejectedMerchants } = AgentsUtil.buildAgentsArray(organizationID, agents, agentsData);
    
            // Add or update agents in the database based on the re-audit
            const allResults = [];
            for (const agent of agentsArray) {
                let result;
                if (Array.isArray(agents) && agents.some(a => a.fName === agent.fName && a.lName === agent.lName)) {
                    // Update existing agent
                    result = await AgentsModel.updateAgent(organizationID, agent);
                    if (!result.acknowledged) {
                        throw new Error('Error updating agent: ' + result.message);
                    }
                } else {
                    // Add new agent
                    result = await AgentsModel.createAgent(agent);
                    if (!result.acknowledged) {
                        throw new Error('Error adding agent: ' + result.message);
                    }
                }
                allResults.push(result);
            }
    
            // Return the results along with needsAudit and rejectedMerchants
            return { results: allResults, needsAudit, rejectedMerchants };
        } catch (error) {
            throw new Error('Error during re-audit in coordinator: ' + error);
        }
    };
    

    static uploadAgents = async (organizationID, fileBuffer, mimetype) => {
        try {
            const csvData = await parseFile(fileBuffer, mimetype);
            if (!csvData || csvData.length === 0) {
                throw new Error('Parsed data is empty. Please check the input file.');
            }
    
            // Get a list of all agents for an organization
            let agents = await AgentsModel.getAgents(organizationID);
    
            // Ensure agents is an array
            if (!Array.isArray(agents)) {
                agents = [];
            }
    
            // Use the utility to build the agents array and collect any rows needing audit or rejection
            const { agentsArray, needsAudit, rejectedMerchants } = AgentsUtil.buildAgentsArray(organizationID, agents, csvData);
    
            // Add or update the agents in the database
            const allResults = [];
            for (const agent of agentsArray) {
                let result;
                if (Array.isArray(agents) && agents.some(a => a.fName === agent.fName && a.lName === agent.lName)) {
                    // Update existing agent
                    result = await AgentsModel.updateAgent(organizationID, agent);
                    if (!result.acknowledged) {
                        throw new Error('Error updating agent: ' + result.message);
                    }
                } else {
                    // Add new agent
                    result = await AgentsModel.createAgent(agent);
                    if (!result.acknowledged) {
                        throw new Error('Error adding agent: ' + result.message);
                    }
                }
                allResults.push(result);
            }
    
            // Return results, needsAudit, and rejectedMerchants to the controller
            return { results: allResults, needsAudit, rejectedMerchants };
        } catch (error) {
            throw new Error('Error adding agents in coordinator: ' + error);
        }
    };
    
    

    static getAgent = async (organizationID, agentID) => {
        try {
            const agent = await AgentsModel.getAgent(organizationID, agentID);
            if (!agent) {
                return { success: false, message: "Agent not found" };
            }
            return { success: true, agent };
        } catch (error) {
            throw error;
        }
    };

    static getAgents = async (organizationID,) => {
        try {
            const agents = await AgentsModel.getAgents(organizationID);
            return { success: true, agents };
        } catch (error) {
            throw error;
        }
    };

    static updateAgent = async (organizationID, agentID, update) => {
        try {
            const agent = await AgentsModel.getAgent(organizationID, agentID);
            if (!agent) {
                return { success: false, message: "Agent not found" };
            }
            // Apply the updates to the agent object
            const updatedAgent = new Agent(organizationID, agent.fName, agent.lName, agent.company, agent.manager,agent.clients,agent.additional_splits);

            updatedAgent.updateAgent(update); // This assumes updateAgent is defined in the Agent class

            const result = await AgentsModel.updateAgent(organizationID, updatedAgent);
            if (result.acknowledged) {
                return { success: true, agent: updatedAgent };
            } else {
                return { success: false, message: "Failed to update agent" };
            }
        } catch (error) {
            throw error;
        }
    };

    static deleteAgent = async (organizationID, agentID) => {
        try {
            const result = await AgentsModel.deleteAgent(organizationID, agentID);
            if (result.deletedCount > 0) {
                return result;
            }
            return { success: false, message: "Failed to delete agent" };
        } catch (error) {
            throw error;
        }
    };
}
