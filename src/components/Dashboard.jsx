import React, { useEffect, useState } from "react";

function Dashboard({ contract, account, votingEvents }) {
  const [userVotes, setUserVotes] = useState([]);

  const fetchUserVotes = async () => {
    if (!contract || !account) return;
    try {
      const votes = [];
      for (let i = 0; i < votingEvents.length; i++) {
        const hasVoted = await contract.votingEvents(i, account);
        if (hasVoted) {
          votes.push({ eventId: i, event: votingEvents[i] });
        }
      }
      setUserVotes(votes);
    } catch (error) {
      console.error("Error fetching user votes:", error);
    }
  };

  useEffect(() => {
    fetchUserVotes();
  }, [contract, account, votingEvents]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Your Dashboard</h2>
      {account ? (
        <div>
          <h3 className="text-lg font-semibold mb-4">Your Voting Activity</h3>
          {userVotes.length === 0 ? (
            <p>You haven't voted in any events yet.</p>
          ) : (
            <ul className="space-y-4">
              {userVotes.map((vote) => (
                <li key={vote.eventId} className="border-b pb-2">
                  <p><strong>Event:</strong> {vote.event.name}</p>
                  <p><strong>Status:</strong> {vote.event.isActive ? "Active" : "Ended"}</p>
                  {vote.event.winner !== "0x0000000000000000000000000000000000000000" && (
                    <p>
                      <strong>Winner:</strong> {vote.event.winner} ({vote.event.highestVoteCount} votes)
                      {vote.event.winner.toLowerCase() === account.toLowerCase() ? (
                        <span className="text-green-600 font-bold"> (You Won!)</span>
                      ) : (
                        <span className="text-red-600 font-bold"> (You Lost)</span>
                      )}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p>Please connect your wallet to view your dashboard.</p>
      )}
    </div>
  );
}

export default Dashboard;