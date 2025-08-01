import React from 'react';

const TwitterIcon = () => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current">
    <title>X</title>
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
  </svg>
);

const SocialLinks = () => {
  return (
    <div className="fixed bottom-4 right-4 flex items-center gap-4">
      <a
        href="https://x.com/Bonkgambit"
        target="_blank"
        rel="noopener noreferrer"
        className="text-white/70 hover:text-white transition-colors"
        aria-label="Twitter"
      >
        <TwitterIcon />
      </a>
    </div>
  );
};

export default SocialLinks; 