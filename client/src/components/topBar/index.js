import React, { useEffect, useRef, useState } from "react";
import anime from "animejs";

const usePrevious = (value) => {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

export default ({ score }) => {
  const scoreRef = useRef();
  const previousScore = usePrevious(score);
  const [displayedScore, setDisplayedScore] = useState(0);

  useEffect(() => {
    setDisplayedScore(score || 0);
  }, []);

  useEffect(() => {
    let counter = {
      score: previousScore,
    };

    anime({
      targets: counter,
      score,
      easing: "linear",
      round: 1,
      update: () => setDisplayedScore(counter.score),
    });
  }, [score]);

  return (
    <div
      style={{
        height: 50,
        width: "100%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        <div>HIGH SCORE</div>
        <div>23435546</div>
      </div>
      <div>
        <div>SCORE</div>
        <div ref={scoreRef}>{displayedScore}</div>
      </div>
    </div>
  );
};

// Medium priority
//
