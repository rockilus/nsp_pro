/**
 * Example: Connecting to AWS DocumentDB from Node.js
 * 
 * This example shows how to connect to DocumentDB using the credentials
 * stored in AWS Secrets Manager.
 * 
 * Requirements:
 * - aws-sdk (v3)
 * - mongodb driver
 * - global-bundle.pem certificate file
 * 
 * Usage:
 *   npm install @aws-sdk/client-secrets-manager mongodb
 *   node documentdb_example.js
 */

const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { MongoClient } = require('mongodb');
const fs = require('fs');

class DocumentDBClient {
    constructor(secretName, region = 'us-east-1') {
        this.secretName = secretName;
        this.region = region;
        this.client = null;
        this.db = null;
        this.secretsClient = new SecretsManagerClient({ region: this.region });
    }

    async getCredentials() {
        try {
            const command = new GetSecretValueCommand({ SecretId: this.secretName });
            const response = await this.secretsClient.send(command);
            return JSON.parse(response.SecretString);
        } catch (error) {
            throw new Error(`Failed to retrieve credentials: ${error.message}`);
        }
    }

    async connect(databaseName = 'nsp_pro') {
        try {
            const credentials = await this.getCredentials();
            
            // Build connection URI
            const connectionUri = `mongodb://${credentials.username}:${credentials.password}@${credentials.host}:${credentials.port}/?tls=true&tlsCAFile=global-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false`;

            // MongoDB client options
            const options = {
                tls: true,
                tlsCAFile: 'global-bundle.pem',
                retryWrites: false,
                readPreference: 'secondaryPreferred'
            };

            // Create MongoDB client
            this.client = new MongoClient(connectionUri, options);
            
            // Connect to the cluster
            await this.client.connect();
            
            // Connect to database
            this.db = this.client.db(databaseName);
            
            // Test connection
            await this.client.db('admin').command({ ping: 1 });
            console.log(`Successfully connected to DocumentDB database: ${databaseName}`);
            
        } catch (error) {
            throw new Error(`Failed to connect to DocumentDB: ${error.message}`);
        }
    }

    getDatabase() {
        if (!this.db) {
            throw new Error('Not connected to database. Call connect() first.');
        }
        return this.db;
    }

    async close() {
        if (this.client) {
            await this.client.close();
            console.log('DocumentDB connection closed');
        }
    }
}

async function exampleUsage() {
    // Initialize client
    const docdb = new DocumentDBClient(
        'nsp-pro/prod/documentdb/credentials',
        'us-east-1'
    );

    try {
        // Connect to database
        await docdb.connect('nsp_pro');
        
        // Get database reference
        const db = docdb.getDatabase();
        
        // Example: Insert a document
        const collection = db.collection('schedules');
        const document = {
            schedule_id: 'example_001',
            facility_id: 'facility_123',
            shifts: [
                {
                    shift_id: 'shift_001',
                    start_time: '2024-01-01T08:00:00Z',
                    end_time: '2024-01-01T16:00:00Z',
                    role: 'nurse',
                    department: 'emergency'
                }
            ],
            created_at: '2024-01-01T00:00:00Z',
            status: 'active'
        };

        const insertResult = await collection.insertOne(document);
        console.log(`Inserted document with ID: ${insertResult.insertedId}`);

        // Example: Query documents
        const schedules = await collection.find({ facility_id: 'facility_123' }).toArray();
        console.log(`Found ${schedules.length} schedules`);

        for (const schedule of schedules) {
            console.log(`Schedule ID: ${schedule.schedule_id}`);
            console.log(`Number of shifts: ${schedule.shifts.length}`);
        }

        // Example: Update a document
        const updateResult = await collection.updateOne(
            { schedule_id: 'example_001' },
            { $set: { status: 'completed' } }
        );
        console.log(`Updated ${updateResult.modifiedCount} document(s)`);

        // Example: Delete a document
        const deleteResult = await collection.deleteOne({ schedule_id: 'example_001' });
        console.log(`Deleted ${deleteResult.deletedCount} document(s)`);

    } catch (error) {
        console.error(`Error: ${error.message}`);
    } finally {
        // Always close the connection
        await docdb.close();
    }
}

// Main execution
async function main() {
    // Check if certificate file exists
    if (!fs.existsSync('global-bundle.pem')) {
        console.error('Error: global-bundle.pem not found!');
        console.error('Please run the download-cert.sh script first or download it manually:');
        console.error('wget https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem');
        process.exit(1);
    }

    await exampleUsage();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { DocumentDBClient };
