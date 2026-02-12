"use client";

import { useState } from "react";

const foods = [
  "Pizza",
  "Sushi",
  "Burger",
  "Ramen",
  "Samgyupsal",
  "Fried Chicken",
  "Tacos",
  "Pasta",
  "Steak",
  "Hotpot",
];

export default function Home() {
  const [index, setIndex] = useState(0);
  const [user1Likes, setUser1Likes] = useState<string[]>([]);
  const [user2Likes, setUser2Likes] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<1 | 2>(1);
  const [match, setMatch] = useState<string | null>(null);

  const currentFood = foods[index];

  const handleSwipe = (like: boolean) => {
    if (match) return;

    if (like) {
      if (currentUser === 1) {
        const updated = [...user1Likes, currentFood];
        setUser1Likes(updated);

        if (user2Likes.includes(currentFood)) {
          setMatch(currentFood);
          return;
        }
      } else {
        const updated = [...user2Likes, currentFood];
        setUser2Likes(updated);

        if (user1Likes.includes(currentFood)) {
          setMatch(currentFood);
          return;
        }
      }
    }

    if (index < foods.length - 1) {
      setIndex(index + 1);
    } else {
      setIndex(0);
      setCurrentUser(currentUser === 1 ? 2 : 1);
    }
  };

  const reset = () => {
    setIndex(0);
    setUser1Likes([]);
    setUser2Likes([]);
    setCurrentUser(1);
    setMatch(null);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      {match ? (
        <div className="text-center">
          <h1 className="text-4xl mb-6">🍽 It's a Match!</h1>
          <p className="text-2xl mb-6">{match}</p>
          <button
            onClick={reset}
            className="px-6 py-3 bg-green-500 rounded-xl"
          >
            Start Again
          </button>
        </div>
      ) : (
        <>
          <h2 className="text-xl mb-4">
            User {currentUser}, do you like:
          </h2>
          <div className="text-4xl mb-10">{currentFood}</div>
          <div className="flex gap-6">
            <button
              onClick={() => handleSwipe(false)}
              className="px-8 py-4 bg-red-600 rounded-xl"
            >
              👎
            </button>
            <button
              onClick={() => handleSwipe(true)}
              className="px-8 py-4 bg-green-600 rounded-xl"
            >
              👍
            </button>
          </div>
        </>
      )}
    </div>
  );
}
