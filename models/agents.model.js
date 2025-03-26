import { db } from '../lib/database.lib.js';
import Constants from '../lib/constants.lib.js';

export default class AgentsModel {

    static createAgent = async (agent) => {
        try {
            const result = await db.dbAgents().insertOne(agent);
            if (!result.acknowledged) {
                throw new Error('Model Error: Error adding agent to DB');
            }
            return result;
        } catch (error) {
            throw error;
        }
    };

    static createAgents = async (agents) => {
        try {
            const result = await db.dbAgents().insertMany(agents);
            if (!result.acknowledged) {
                throw new Error('Model Error: Error adding agents to DB');
            }
            return result;
        } catch (error) {
            throw error;
        }
    };
    
    static getAgent = async (organizationID, agentID) => {
        try {
            const agent = await db.dbAgents().findOne({organizationID,  agentID }, { projection: Constants.DEFAULT_PROJECTION });
            if (!agent) {
                return { message: `No agent found with ID ${agentID}` };
            }
            return agent;
        } catch (error) {
            throw error; // Make sure error is thrown for consistency
        }
    }

    static getAgents = async (organizationID) => {
        try {
            const agents = await db.dbAgents().find({organizationID}, { projection: Constants.DEFAULT_PROJECTION }).toArray();
            if (agents.length === 0) {
                return { message: 'No agents found' };
            }
            return agents;
        } catch (error) {
            throw error;
        }
    };

    static updateAgent = async (organizationID, agent) => {
        try {
            const result = await db.dbAgents().replaceOne({organizationID,  agentID: agent.agentID }, agent);
            if (result.matchedCount === 0) {
                return { message: 'Agent not found to update' };
            }
            if (!result.acknowledged) {
                throw new Error('Model Error: Error updating agent in DB');
            }
            return result;
        } catch (error) {
            throw error;
        }
    };

    static deleteAgent = async (organizationID, agentID) => {
        try {
            const result = await db.dbAgents().deleteOne({organizationID,  agentID });
            if (result.deletedCount === 0) {
                return { message: 'Agent not found to delete' };
            }
            if (!result.acknowledged) {
                throw new Error('Model Error: Error deleting agent in DB');
            }
            return result;
        } catch (error) {
            throw error;
        }
    };
}
