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

  // Connect to Kaia Wallet
  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, VotingArtifact.abi, signer);

        setProvider(provider);
        setSigner(signer);
        setContract(contract);
        setAccount(address);
        toast.success("Wallet connected!");
      } else {
        toast.error("Please install Kaia Wallet!");
      }
    } catch (error) {
      toast.error("Failed to connect wallet!");
      console.error(error);
    }
  };

  // Fetch all voting events
  const fetchVotingEvents = async () => {
    try {
      const readOnlyProvider = new ethers.JsonRpcProvider("https://public-en-baobab.klaytn.net");
      const readOnlyContract = new ethers.Contract(CONTRACT_ADDRESS, VotingArtifact.abi, readOnlyProvider);
      const eventCount = await readOnlyContract.eventCount();
      const events = [];

      for (let i = 0; i < eventCount; i++) {
        const event = await readOnlyContract.getVotingEvent(i);
        const candidates = await readOnlyContract.getCandidates(i);
        events.push({ id: i, ...event, candidates });
      }

      setVotingEvents(events);
    } catch (error) {
      console.error("Error fetching voting events:", error);
    }
  };

  useEffect(() => {
    fetchVotingEvents();
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", () => window.location.reload());
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