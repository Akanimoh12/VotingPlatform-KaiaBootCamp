import React, { useState } from "react";
import { toast } from "react-toastify";

function CreateVotingEvent({ contract, fetchVotingEvents }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [endDate, setEndDate] = useState("");
  const [candidates, setCandidates] = useState([{ address: "", name: "" }]);

  const addCandidate = () => {
    setCandidates([...candidates, { address: "", name: "" }]);
  };

  const handleCandidateChange = (index, field, value) => {
    const newCandidates = [...candidates];
    newCandidates[index][field] = value;
    setCandidates(newCandidates);
  };

  const createEvent = async (e) => {
    e.preventDefault();
    try {
      const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
      const tx = await contract.createVotingEvent(name, description, endTimestamp);
      await tx.wait();
      toast.success("Voting event created!");

      // Register candidates
      for (const candidate of candidates) {
        if (candidate.address && candidate.name) {
          const tx = await contract.registerCandidate(Number(tx.events[0].args.eventId), candidate.address, candidate.name);
          await tx.wait();
        }
      }
      toast.success("Candidates registered!");
      fetchVotingEvents();
      setName("");
      setDescription("");
      setEndDate("");
      setCandidates([{ address: "", name: "" }]);
    } catch (error) {
      toast.error("Failed to create voting event!");
      console.error(error);
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
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 border rounded"
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
            <input
              type="text"
              placeholder="Candidate Address"
              value={candidate.address}
              onChange={(e) => handleCandidateChange(index, "address", e.target.value)}
              className="w-1/2 p-2 border rounded"
              required
            />
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
          disabled={!contract}
        >
          Create Voting Event
        </button>
      </form>
    </div>
  );
}

export default CreateVotingEvent;