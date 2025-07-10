import React, { useState } from "react";
import { ethers } from "ethers";
import { toast } from "react-toastify";

function CreateVotingEvent({ contract, fetchVotingEvents }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [endDate, setEndDate] = useState("");
  const [candidates, setCandidates] = useState([{ address: "", name: "", addressValid: true }]);

  const addCandidate = () => {
    setCandidates([...candidates, { address: "", name: "", addressValid: true }]);
  };

  const handleCandidateChange = (index, field, value) => {
    const newCandidates = [...candidates];
    if (field === "address") {
      // Sanitize: allow only 0x and hex characters (0-9, a-f)
      let sanitizedValue = value.trim().toLowerCase();
      sanitizedValue = sanitizedValue.startsWith("0x") ? sanitizedValue : `0x${sanitizedValue.replace(/^0x+/g, "")}`;
      sanitizedValue = sanitizedValue.slice(0, 2) + sanitizedValue.slice(2).replace(/[^0-9a-f]/g, "");
      sanitizedValue = sanitizedValue.slice(0, 42); // Enforce max length
      newCandidates[index][field] = sanitizedValue;
      // Validate in real-time
      const isValid = sanitizedValue === "0x" || (sanitizedValue.length === 42 && ethers.isAddress(sanitizedValue));
      newCandidates[index].addressValid = isValid;
      // Log ASCII codes for debugging invisible characters
      const asciiCodes = sanitizedValue.split("").map((char) => char.charCodeAt(0));
      console.log("Address input changed:", {
        index,
        rawValue: value,
        sanitizedValue,
        asciiCodes,
        isValid,
        length: sanitizedValue.length,
      });
    } else {
      newCandidates[index][field] = value.trim();
    }
    setCandidates(newCandidates);
  };

  const createEvent = async (e) => {
    e.preventDefault();
    if (!contract) {
      toast.error("Please connect your wallet first!");
      console.error("Contract not initialized");
      return;
    }

    try {
      // Reset form state to ensure fresh data
      setCandidates(candidates.map((c) => ({ ...c, address: c.address.trim(), name: c.name.trim() })));

      // Validate inputs
      if (!name.trim() || !description.trim() || !endDate) {
        toast.error("Please fill in all required fields!");
        return;
      }

      // Validate end date
      const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
      if (endTimestamp <= Math.floor(Date.now() / 1000)) {
        toast.error("End date must be in the future!");
        return;
      }

      // Validate candidates
      for (const candidate of candidates) {
        if (!candidate.address.trim() || !candidate.name.trim()) {
          toast.error("All candidate fields must be filled!");
          return;
        }
        const rawAddress = candidate.address.trim();
        // Log ASCII codes for debugging
        const asciiCodes = rawAddress.split("").map((char) => char.charCodeAt(0));
        console.log("Validating candidate address:", {
          rawAddress,
          asciiCodes,
          length: rawAddress.length,
          startsWith0x: rawAddress.startsWith("0x"),
          containsDot: rawAddress.includes("."),
          isHex: rawAddress.slice(2).match(/^[0-9a-f]{40}$/),
        });

        // Strict checks
        if (
          !rawAddress.startsWith("0x") ||
          rawAddress.length !== 42 ||
          rawAddress.includes(".") ||
          !rawAddress.slice(2).match(/^[0-9a-f]{40}$/)
        ) {
          console.error("Invalid address format:", rawAddress);
          toast.error(`Invalid address: ${rawAddress}. Must be 0x + 40 hex characters.`);
          return;
        }

        // Normalize and validate
        let normalizedAddress;
        try {
          normalizedAddress = ethers.getAddress(rawAddress);
          console.log("Normalized address:", normalizedAddress);
        } catch (error) {
          console.error("Address normalization failed:", error);
          toast.error(`Invalid address: ${rawAddress}. Ensure it’s a valid Kaia address.`);
          return;
        }

        if (!ethers.isAddress(normalizedAddress)) {
          console.error("Final address validation failed:", normalizedAddress);
          toast.error(`Invalid address: ${rawAddress}. Must be a valid Kaia address.`);
          return;
        }
      }

      // Log final input data
      const inputData = {
        name: name.trim(),
        description: description.trim(),
        endTimestamp,
        candidates: candidates.map((c) => ({
          rawAddress: c.address.trim(),
          normalizedAddress: ethers.getAddress(c.address.trim()),
          name: c.name.trim(),
        })),
      };
      console.log("Creating voting event with:", JSON.stringify(inputData, null, 2));

      // Create voting event
      console.log("Sending createVotingEvent transaction...");
      const tx = await contract.createVotingEvent(name.trim(), description.trim(), endTimestamp);
      const receipt = await tx.wait();
      console.log("Transaction receipt:", JSON.stringify(receipt, null, 2));
      toast.success("Voting event created!");

      // Extract event ID
      const eventId = receipt.logs
        .filter((log) => {
          try {
            const parsedLog = contract.interface.parseLog(log);
            return parsedLog.name === "VotingEventCreated";
          } catch (error) {
            return false;
          }
        })
        .map((log) => contract.interface.parseLog(log).args.eventId)[0];

      console.log("Event ID:", Number(eventId));

      // Register candidates
      for (const candidate of candidates) {
        const rawAddress = candidate.address.trim();
        const normalizedAddress = ethers.getAddress(rawAddress);
        console.log("Before registering candidate:", {
          rawAddress,
          normalizedAddress,
          name: candidate.name.trim(),
          isValid: ethers.isAddress(normalizedAddress),
          asciiCodes: rawAddress.split("").map((char) => char.charCodeAt(0)),
        });
        if (!ethers.isAddress(normalizedAddress)) {
          throw new Error(`Invalid address detected before registration: ${rawAddress}`);
        }
        const tx = await contract.registerCandidate(Number(eventId), normalizedAddress, candidate.name.trim());
        await tx.wait();
        toast.success(`Candidate ${candidate.name.trim()} registered!`);
      }

      toast.success("All candidates registered!");
      fetchVotingEvents();
      setName("");
      setDescription("");
      setEndDate("");
      setCandidates([{ address: "", name: "", addressValid: true }]);
    } catch (error) {
      console.error("Error creating voting event:", error);
      let errorMessage = "Failed to create voting event. Please try again.";
      if (error.code === 4001) {
        errorMessage = "User rejected the transaction.";
      } else if (error.message.includes("network does not support ENS")) {
        errorMessage = "Invalid address detected. Ensure all addresses are 0x + 40 hex characters (42 total).";
      } else if (error.message.includes("end date")) {
        errorMessage = "End date must be in the future.";
      } else if (error.message.includes("revert")) {
        errorMessage = "Transaction reverted. Check contract requirements (e.g., valid inputs, gas).";
      }
      toast.error(errorMessage);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Create New Voting Event</h2>
      <form onSubmit={createEvent}>
        <div className="mb-4">
          <label className="block text-gray-700">Event Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="e.g., Presidential Election"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="e.g., Vote for the next president"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">End Date</label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <h3 className="text-lg font-semibold mb-2">Candidates</h3>
        {candidates.map((candidate, index) => (
          <div key={index} className="flex space-x-4 mb-2">
            <div className="w-1/2">
              <input
                type="text"
                placeholder="Candidate Address (0x + 40 hex chars, e.g., 0x1234567890abcdef1234567890abcdef12345678)"
                value={candidate.address}
                onChange={(e) => handleCandidateChange(index, "address", e.target.value)}
                className={`w-full p-2 border rounded ${
                  candidate.addressValid ? "border-gray-300" : "border-red-500"
                }`}
                required
              />
              {!candidate.addressValid && candidate.address && (
                <p className="text-red-500 text-sm">Invalid address: must be 0x + 40 hex characters</p>
              )}
            </div>
            <input
              type="text"
              placeholder="Candidate Name"
              value={candidate.name}
              onChange={(e) => handleCandidateChange(index, "name", e.target.value)}
              className="w-1/2 p-2 border rounded"
              required
            />
          </div>
        ))}
        <button
          type="button"
          onClick={addCandidate}
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 mb-4"
        >
          Add Candidate
        </button>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          disabled={!contract || candidates.some((c) => !c.addressValid || !c.address.trim() || !c.name.trim())}
        >
          Create Voting Event
        </button>
      </form>
    </div>
  );
}

export default CreateVotingEvent;