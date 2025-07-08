import React from "react";
import { toast } from "react-toastify";

function VotingEventCard({ event, contract, account, fetchVotingEvents }) {
  const vote = async (candidateAddress) => {
    try {
      const tx = await contract.vote(event.id, candidateAddress);
      await tx.wait();
      toast.success("Vote casted successfully!");
      fetchVotingEvents();
    } catch (error) {
      toast.error("Failed to cast vote!");
      console.error(error);
    }
  };

  const endVoting = async () => {
    try {
      const tx = await contract.endVoting(event.id);
      await tx.wait();
      toast.success("Voting ended!");
      fetchVotingEvents();
    } catch (error) {
      toast.error("Failed to end voting!");
      console.error(error);
    }
  };

  const isEnded = !event.isActive || Number(event.endDate) * 1000 < Date.now();

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-2">{event.name}</h2>
      <p className="text-gray-600 mb-4">{event.description}</p>
      <p className="text-sm text-gray-500">End Date: {new Date(Number(event.endDate) * 1000).toLocaleString()}</p>
      <p className="text-sm text-gray-500">Creator: {event.creator}</p>
      {isEnded && event.winner !== "0x0000000000000000000000000000000000000000" && (
        <p className="text-green-600 font-bold">Winner: {event.winner} ({event.highestVoteCount} votes)</p>
      )}
      <h3 className="text-lg font-semibold mt-4">Candidates:</h3>
      <ul className="space-y-2">
        {event.candidates.map((candidate, index) => (
          <li key={index} className="flex justify-between items-center">
            <span>{candidate.name} ({candidate.voteCount} votes)</span>
            {!isEnded && contract && (
              <button
                onClick={() => vote(candidate.candidateAddress)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                disabled={event.hasVoted[account]}
              >
                Vote
              </button>
            )}
          </li>
        ))}
      </ul>
      {account === event.creator && !isEnded && (
        <button
          onClick={endVoting}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          End Voting
        </button>
      )}
    </div>
  );
}

export default VotingEventCard;