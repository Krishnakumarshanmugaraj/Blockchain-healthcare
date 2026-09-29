const grpc = require("@grpc/grpc-js");
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
