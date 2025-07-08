import React from "react";

function Navbar({ connectWallet, account, setView }) {
  return (
    <nav className="bg-blue-600 text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold">Voting DApp</h1>
        <div className="flex space-x-4">
          <button
            onClick={() => setView("home")}
            className="hover:underline"
          >
            Home
          </button>
          <button
            onClick={() => setView("create")}
            className="hover:underline"
          >
            Create Voting
          </button>
          <button
            onClick={() => setView("dashboard")}
            className="hover:underline"
          >
            Dashboard
          </button>
          {account ? (
            <span className="bg-blue-800 px-4 py-2 rounded">
              {account.slice(0, 6)}...{account.slice(-4)}
            </span>
          ) : (
            <button
              onClick={connectWallet}
              className="bg-white text-blue-600 px-4 py-2 rounded hover:bg-gray-200"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;