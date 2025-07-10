// const CONTRACT_ADDRESS = "0xe1a7320d552d49a04b287beff69ac9cd2927e704"; // Replace with your contract address
import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Navbar from "./components/Navbar";
import VotingEventCard from "./components/VotingEventCard";
import CreateVotingEvent from "./components/CreateVotingEvent";
import Dashboard from "./components/Dashboard";
import VotingArtifact from "./contracts/Voting.json";
import "./App.css";

const CONTRACT_ADDRESS = "0xe1a7320d552d49a04b287beff69ac9cd2927e704";

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [votingEvents, setVotingEvents] = useState([]);
  const [view, setView] = useState("home");

  const kaiaBaobab = {
    chainId: "0x3E9",
    chainName: "Kaia Baobab Testnet",
    rpcUrls: ["https://public-en-kairos.node.kaia.io"],
    nativeCurrency: {
      name: "KAI",
      symbol: "KAI",
      decimals: 18,
    },
    blockExplorerUrls: ["https://baobab.scope.klaytn.com/"],
  };

  const connectWallet = async () => {
    try {
      console.log("Attempting to connect to MetaMask...");
      if (!window.ethereum) {
        toast.error("MetaMask is not installed! Please install MetaMask.");
        console.error("MetaMask not detected.");
        return;
      }

      console.log("Requesting network switch to Kaia Baobab...");
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: kaiaBaobab.chainId }],
        });
      } catch (switchError) {
        console.error("Network switch error:", switchError);
        if (switchError.code === 4902) {
          console.log("Adding Kaia Baobab Testnet to MetaMask...");
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [kaiaBaobab],
          });
        } else {
          throw switchError;
        }
      }

      console.log("Initializing provider...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      console.log("Requesting accounts...");
      const accounts = await provider.send("eth_requestAccounts", []);
      console.log("Accounts received:", accounts);

      if (accounts.length === 0) {
        toast.error("No accounts found. Please connect MetaMask.");
        return;
      }

      const address = accounts[0];
      // Validate address
      if (!ethers.isAddress(address)) {
        console.error("Invalid account address:", address, "ASCII:", address.split("").map((c) => c.charCodeAt(0)));
        toast.error("Invalid wallet address detected. Ensure MetaMask is using a valid Kaia address.");
        return;
      }

      console.log("Getting signer...");
      const signer = await provider.getSigner();
      // console.log("Signer address:", address);

      // console.log("Initializing contract...");
      const contract = new ethers.Contract(CONTRACT_ADDRESS, VotingArtifact, signer);
      console.log("Contract initialized:", contract.address);

      setProvider(provider);
      setSigner(signer);
      setContract(contract);
      setAccount(address);
      toast.success(`Wallet connected: ${address.slice(0, 6)}...${address.slice(-4)}`);
    } catch (error) {
      console.error("Wallet connection error:", error);
      let errorMessage = "Failed to connect wallet. Please try again.";
      if (error.code === 4001) {
        errorMessage = "User rejected the connection request.";
      } else if (error.code === -32002) {
        errorMessage = "MetaMask is already processing a request. Check your MetaMask extension.";
      } else if (error.message.includes("network does not support ENS")) {
        errorMessage = "Invalid address detected during wallet connection. Ensure MetaMask is using a valid Kaia address.";
      }
      toast.error(errorMessage);
    }
  };

  const fetchVotingEvents = async () => {
    try {
      console.log("Fetching voting events...");
      const readOnlyProvider = new ethers.JsonRpcProvider(kaiaBaobab.rpcUrls[0]);
      const readOnlyContract = new ethers.Contract(CONTRACT_ADDRESS, VotingArtifact, readOnlyProvider);
      const eventCount = await readOnlyContract.eventCount();
      console.log("Event count:", Number(eventCount));
      const events = [];

      for (let i = 0; i < eventCount; i++) {
        const event = await readOnlyContract.getVotingEvent(i);
        const candidates = await readOnlyContract.getCandidates(i);
        events.push({
          id: i,
          name: event[0],
          description: event[1],
          endDate: event[2],
          creator: event[3],
          isActive: event[4],
          winner: event[5],
          highestVoteCount: event[6],
          candidates,
        });
      }

      console.log("Fetched events:", events);
      setVotingEvents(events);
    } catch (error) {
      console.error("Error fetching voting events:", error);
      toast.error("Failed to fetch voting events.");
    }
  };

  useEffect(() => {
    console.log("Initializing app...");
    fetchVotingEvents();

    if (window.ethereum) {
      console.log("Setting up MetaMask event listeners...");
      const handleAccountsChanged = (accounts) => {
        console.log("Accounts changed:", accounts);
        if (accounts.length === 0) {
          setAccount(null);
          setContract(null);
          setSigner(null);
          setProvider(null);
          toast.info("Wallet disconnected.");
        } else {
          connectWallet();
        }
      };

      const handleChainChanged = (chainId) => {
        console.log("Chain changed to:", chainId);
        window.location.reload();
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        console.log("Cleaning up MetaMask listeners...");
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar connectWallet={connectWallet} account={account} setView={setView} />
      <ToastContainer />
      <div className="container mx-auto p-6">
        {view === "home" && (
          <div>
            <h1 className="text-4xl font-bold text-center mb-8">Available Voting Events</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {votingEvents.map((event) => (
                <VotingEventCard
                  key={event.id}
                  event={event}
                  contract={contract}
                  account={account}
                  fetchVotingEvents={fetchVotingEvents}
                />
              ))}
            </div>
          </div>
        )}
        {view === "create" && (
          <CreateVotingEvent contract={contract} fetchVotingEvents={fetchVotingEvents} />
        )}
        {view === "dashboard" && (
          <Dashboard contract={contract} account={account} votingEvents={votingEvents} />
        )}
      </div>
    </div>
  );
}

export default App;