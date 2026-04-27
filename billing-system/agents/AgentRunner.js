const cron = require("node-cron");
const InsightAgent = require("./InsightAgent");
const RestockAgent = require("./RestockAgent");
const InvoicerAgent = require("./InvoicerAgent");

const runAgents = async () => {
    console.log("--- Starting Agent Run at", new Date().toLocaleString(), "---");

    try {
        // 1. Run Insight Agent
        console.log("Running Insight Agent...");
        await InsightAgent.run();

        // 2. Run Restock Agent
        console.log("Running Restock Agent...");
        await RestockAgent.run();

        // 3. Run Invoicer Agent
        console.log("Running Invoicer Agent...");
        await InvoicerAgent.run();

    } catch (error) {
        console.error("Error during agent run:", error);
    }

    console.log("--- Agent Run Completed ---");
};

// Schedule agents to run every hour
// For development/demo, you might want to run it every 5 minutes: '*/5 * * * *'
// For production, maybe once an hour: '0 * * * *'
cron.schedule("*/5 * * * *", runAgents);

module.exports = { runAgents };
