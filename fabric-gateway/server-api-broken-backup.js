const express = require("express");
const grpc = require("@grpc/grpc-js");

const {
    connect,
    hash,
    signers,
} = require("@hyperledger/fabric-gateway");

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = 3000;

app.use(express.json());

const TEST_NETWORK = path.resolve(
    process.env.FABRIC_TEST_NETWORK ||
    path.join(
        process.env.HOME,
        "hyperledger",
        "fabric-samples",
        "test-network"
    )
);

const channelName = "mychannel";
const chaincodeName = "healthcare";

const peerEndpoint = "localhost:7051";
const peerHostAlias = "peer0.org1.example.com";

const tlsCertPath = path.join(
    TEST_NETWORK,
    "organizations",
    "peerOrganizations",
    "org1.example.com",
    "peers",
    "peer0.org1.example.com",
    "tls",
    "ca.crt"
);

const certPath = path.join(
    TEST_NETWORK,
    "organizations",
    "peerOrganizations",
    "org1.example.com",
    "users",
    "Admin@org1.example.com",
    "msp",
    "signcerts",
    "Admin@org1.example.com-cert.pem"
);

const keyPath = path.join(
    TEST_NETWORK,
    "organizations",
    "peerOrganizations",
    "org1.example.com",
    "users",
    "Admin@org1.example.com",
    "msp",
    "keystore",
    "priv_sk"
);

function newGrpcConnection() {
    const tlsRootCert = fs.readFileSync(tlsCertPath);

    const tlsCredentials = grpc.credentials.createSsl(
        tlsRootCert
    );

    return new grpc.Client(
        peerEndpoint,
        tlsCredentials,
        {
            "grpc.ssl_target_name_override": peerHostAlias,
        }
    );
}

function newIdentity() {
    const credentials = fs.readFileSync(certPath);

    return {
        mspId: "Org1MSP",
        credentials,
    };
}

function newSigner() {
    const privateKeyPem = fs.readFileSync(keyPath);

    const privateKey = crypto.createPrivateKey(
        privateKeyPem
    );

    return signers.newPrivateKeySigner(privateKey);
}

let client;
let gateway;
let contract;

async function connectToFabric() {
    console.log("=================================");
    console.log("Healthcare Fabric Gateway API");
    console.log("=================================");

    console.log("Fabric network:", TEST_NETWORK);
    console.log("Channel:", channelName);
    console.log("Chaincode:", chaincodeName);
    console.log("Peer:", peerEndpoint);

    console.log("\nChecking certificates...");

    for (const file of [
        tlsCertPath,
        certPath,
        keyPath,
    ]) {
        if (!fs.existsSync(file)) {
            throw new Error(
                `Required Fabric file not found: ${file}`
            );
        }

        console.log("OK:", file);
    }

    client = newGrpcConnection();

    gateway = connect({
        client,
        identity: newIdentity(),
        signer: newSigner(),
        hash: hash.sha256,

        evaluateOptions: () => ({
            deadline: Date.now() + 5000,
        }),

        endorseOptions: () => ({
            deadline: Date.now() + 15000,
        }),

        submitOptions: () => ({
            deadline: Date.now() + 15000,
        }),

        commitStatusOptions: () => ({
            deadline: Date.now() + 60000,
        }),
    });

    const network = gateway.getNetwork(channelName);

    contract = network.getContract(chaincodeName);

    console.log("\nConnected to Fabric Gateway.");
    console.log("Channel:", channelName);
    console.log("Chaincode:", chaincodeName);
}

/*
==================================================
HEALTH CHECK
==================================================
*/

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        service: "Healthcare Fabric Gateway",
        fabric: true,
        channel: channelName,
        chaincode: chaincodeName,
    });
});

/*
==================================================
READ MEDICAL RECORD
GET /records/R010
==================================================
*/

app.get("/records/:recordId", async (req, res) => {
    try {
        const recordId = req.params.recordId;

        const result = await contract.evaluateTransaction(
            "ReadMedicalRecord",
            recordId
        );

        const record = JSON.parse(
            Buffer.from(result).toString()
        );

        res.json(record);

    } catch (error) {
        console.error("ReadMedicalRecord error:", error);

        res.status(500).json({
            error: "Failed to read medical record",
            details: error.message,
        });
    }
});

/*
==================================================
GET PATIENT RECORDS
GET /patients/P002/records
==================================================
*/

app.get("/patients/:patientId/records", async (req, res) => {
    try {
        const patientId = req.params.patientId;

        const result = await contract.evaluateTransaction(
            "GetPatientRecords",
            patientId
        );

        const records = JSON.parse(
            Buffer.from(result).toString()
        );

        res.json(records);

    } catch (error) {
        console.error("GetPatientRecords error:", error);

        res.status(500).json({
            error: "Failed to get patient records",
            details: error.message,
        });
    }
});

/*
==================================================
VERIFY RECORD
GET /records/R010/verify?data=Healthcare%20Test%20Data
==================================================
*/

app.get("/records/:recordId/verify", async (req, res) => {
    try {
        const recordId = req.params.recordId;
        const providedData = req.query.data;

        if (!providedData) {
            return res.status(400).json({
                error: "Missing data parameter",
            });
        }

        const result = await contract.evaluateTransaction(
            "VerifyRecord",
            recordId,
            providedData
        );

        const verified =
            Buffer.from(result).toString() === "true";

        res.json({
            recordId,
            verified,
        });

    } catch (error) {
        console.error("VerifyRecord error:", error);

        res.status(500).json({
            error: "Failed to verify record",
            details: error.message,
        });
    }
});

/*
==================================================
CHECK ACCESS
GET /access/P002/D002
==================================================
*/

app.get("/access/:patientId/:doctorId", async (req, res) => {
    try {
        const patientId = req.params.patientId;
        const doctorId = req.params.doctorId;

        const result = await contract.evaluateTransaction(
            "CheckAccess",
            patientId,
            doctorId
        );

        const access =
            Buffer.from(result).toString() === "true";

        res.json({
            patientId,
            doctorId,
            access,
        });

    } catch (error) {
        console.error("CheckAccess error:", error);

        res.status(500).json({
            error: "Failed to check access",
            details: error.message,
        });
    }
});

/*
==================================================
CREATE MEDICAL RECORD
POST /records
==================================================

JSON:
{
    "recordId": "R011",
    "patientId": "P002",
    "doctorId": "D002",
    "diagnosis": "Test Diagnosis",
    "recordHash": "abc123..."
}
==================================================
*/

app.post("/records", async (req, res) => {
    try {
        const {
            recordId,
            patientId,
            doctorId,
            diagnosis,
            recordHash,
        } = req.body;

        if (
            !recordId ||
            !patientId ||
            !doctorId ||
            !diagnosis ||
            !recordHash
        ) {
            return res.status(400).json({
                error:
                    "recordId, patientId, doctorId, diagnosis and recordHash are required",
            });
        }

        await contract.submitTransaction(
            "CreateMedicalRecord",
            recordId,
            patientId,
            doctorId,
            diagnosis,
            recordHash
        );

        res.status(201).json({
            success: true,
            message: "Medical record created on blockchain",
            recordId,
        });

    } catch (error) {
        console.error("CreateMedicalRecord error:", error);

        res.status(500).json({
            error: "Failed to create medical record",
            details: error.message,
        });
    }
});

/*
==================================================
GRANT ACCESS
POST /access/grant
==================================================

{
    "patientId": "P002",
    "doctorId": "D002"
}
==================================================
*/

app.post("/access/grant", async (req, res) => {
    try {
        const {
            patientId,
            doctorId,
        } = req.body;

        if (!patientId || !doctorId) {
            return res.status(400).json({
                error: "patientId and doctorId are required",
            });
        }

        await contract.submitTransaction(
            "GrantAccess",
            patientId,
            doctorId
        );

        res.json({
            success: true,
            patientId,
            doctorId,
            access: true,
        });

    } catch (error) {
        console.error("GrantAccess error:", error);

        res.status(500).json({
            error: "Failed to grant access",
            details: error.message,
        });
    }
});

/*
==================================================
REVOKE ACCESS
POST /access/revoke
==================================================

{
    "patientId": "P002",
    "doctorId": "D002"
}
==================================================
*/

app.post("/access/revoke", async (req, res) => {
    try {
        const {
            patientId,
            doctorId,
        } = req.body;

        if (!patientId || !doctorId) {
            return res.status(400).json({
                error: "patientId and doctorId are required",
            });
        }

        await contract.submitTransaction(
            "RevokeAccess",
            patientId,
            doctorId
        );

        res.json({
            success: true,
            patientId,
            doctorId,
            access: false,
        });

    } catch (error) {
        console.error("RevokeAccess error:", error);

        res.status(500).json({
            error: "Failed to revoke access",
            details: error.message,
        });
    }
});

/*
==================================================
START SERVER
==================================================
*/

async function start() {
    try {
        await connectToFabric();

        app.listen(PORT, () => {
            console.log("\n=================================");
            console.log("HTTP API running");
            console.log(`http://localhost:${PORT}`);
            console.log("=================================");

            console.log("\nAvailable endpoints:");
            console.log("GET  /health");
            console.log("GET  /records/:recordId");
            console.log("GET  /patients/:patientId/records");
            console.log("GET  /records/:recordId/verify");
            console.log("GET  /access/:patientId/:doctorId");
            console.log("POST /records");
            console.log("POST /access/grant");
            console.log("POST /access/revoke");
        });

    } catch (error) {
        console.error("\nFailed to start Fabric Gateway API:");
        console.error(error);

        process.exit(1);
    }
}

process.on("SIGINT", () => {
    console.log("\nShutting down...");

    if (gateway) {
        gateway.close();
    }

    if (client) {
        client.close();
    }

    process.exit(0);
});

start();const grpc = require("@grpc/grpc-js");
const {
    connect,
    hash,
    signers,
} = require("@hyperledger/fabric-gateway");

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const TEST_NETWORK = path.resolve(
    process.env.FABRIC_TEST_NETWORK ||
    path.join(
        process.env.HOME,
        "hyperledger",
        "fabric-samples",
        "test-network"
    )
);

const channelName = "mychannel";
const chaincodeName = "healthcare";

const peerEndpoint = "localhost:7051";
const peerHostAlias = "peer0.org1.example.com";

const tlsCertPath = path.join(
    TEST_NETWORK,
    "organizations",
    "peerOrganizations",
    "org1.example.com",
    "peers",
    "peer0.org1.example.com",
    "tls",
    "ca.crt"
);

const certPath = path.join(
    TEST_NETWORK,
    "organizations",
    "peerOrganizations",
    "org1.example.com",
    "users",
    "Admin@org1.example.com",
    "msp",
    "signcerts",
    "Admin@org1.example.com-cert.pem"
);

const keyPath = path.join(
    TEST_NETWORK,
    "organizations",
    "peerOrganizations",
    "org1.example.com",
    "users",
    "Admin@org1.example.com",
    "msp",
    "keystore",
    "priv_sk"
);

function newGrpcConnection() {
    const tlsRootCert = fs.readFileSync(tlsCertPath);

    const tlsCredentials = grpc.credentials.createSsl(
        tlsRootCert
    );

    return new grpc.Client(
        peerEndpoint,
        tlsCredentials,
        {
            "grpc.ssl_target_name_override": peerHostAlias,
        }
    );
}

function newIdentity() {
    const credentials = fs.readFileSync(certPath);

    return {
        mspId: "Org1MSP",
        credentials,
    };
}

function newSigner() {
    const privateKeyPem = fs.readFileSync(keyPath);

    const privateKey = crypto.createPrivateKey(
        privateKeyPem
    );

    return signers.newPrivateKeySigner(privateKey);
}

async function main() {
    console.log("=================================");
    console.log("Healthcare Fabric Gateway");
    console.log("=================================");

    console.log("Fabric network:", TEST_NETWORK);
    console.log("Channel:", channelName);
    console.log("Chaincode:", chaincodeName);
    console.log("Peer:", peerEndpoint);

    console.log("\nChecking certificates...");

    for (const file of [
        tlsCertPath,
        certPath,
        keyPath,
    ]) {
        if (!fs.existsSync(file)) {
            throw new Error(
                `Required Fabric file not found: ${file}`
            );
        }

        console.log("OK:", file);
    }

    const client = newGrpcConnection();

    const gateway = connect({
        client,
        identity: newIdentity(),
        signer: newSigner(),
        hash: hash.sha256,

        evaluateOptions: () => ({
            deadline: Date.now() + 5000,
        }),

        endorseOptions: () => ({
            deadline: Date.now() + 15000,
        }),

        submitOptions: () => ({
            deadline: Date.now() + 15000,
        }),

        commitStatusOptions: () => ({
            deadline: Date.now() + 60000,
        }),
    });

    try {
        const network = gateway.getNetwork(channelName);

        const contract = network.getContract(
            chaincodeName
        );

        console.log("\nConnected to Fabric Gateway.");
        console.log("Channel:", channelName);
        console.log("Chaincode:", chaincodeName);

        const result = await contract.evaluateTransaction(
            "ReadMedicalRecord",
            "R010"
        );

        console.log(
            "\nR010 from blockchain:"
        );

        console.log(
            Buffer.from(result).toString()
        );

    } finally {
        gateway.close();
        client.close();
    }
}

main().catch((error) => {
    console.error("\nGateway connection failed:");
    console.error(error);

    process.exitCode = 1;
});
