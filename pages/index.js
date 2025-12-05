import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// Retro-style Home with left lore (MEMORIES) and right artwork preview
// Auto-advancing hero artwork and fixed hue animation (2s)

export default function Home() {
  // add your artwork paths here (public/assets/...)
  const heroImages = [
    "/assets/nnnor.jpg",
    "/assets/fgg.jpg",
    "/assets/newer.jpg",
    "/assets/lulu.jpg",
    "/assets/yuyu.jpg",
    "/assets/popio.jpg",
    "/assets/fuuygy.jpg",
    "/assets/jimjik.jpg",
    "/assets/popoiu.jpg",
  ];

  const [heroIndex, setHeroIndex] = React.useState(0);
  const heroImage = heroImages[heroIndex];

  // hue animation fixed to 2 seconds (always on, no UI)
  const hueSeconds = 2;

  // auto-advance artwork every 3s
  React.useEffect(() => {
    if (!heroImages || heroImages.length <= 1) return;
    const interval = setInterval(() => {
      setHeroIndex((s) => (s + 1) % heroImages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [heroImages.length]);

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: Tahoma, Verdana, sans-serif;
          background: url('/assets/background.png') center/cover no-repeat fixed;
          color: #002e6b;
        }

        .wrap {
          max-width: 1100px;
          margin: 80px auto 40px;
          padding: 20px;
        }

        .xp-window {
          width: 100%;
          background: #ece9d8;
          border: 2px solid #999;
          border-radius: 6px;
          box-shadow: inset 1px 1px #fff, inset -1px -1px #555;
        }

        .titlebar {
          background: linear-gradient(to bottom, #0050ef, #003399);
          color: #fff;
          font-weight: 700;
          padding: 8px 10px;
          border-bottom: 1px solid #002266;
          border-top-left-radius: 4px;
          border-top-right-radius: 4px;
        }

        .content {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(260px, 360px);
          gap: 18px;
          padding: 12px;
        }

        .left {
          padding: 10px;
        }

        .memories-title {
          font-size: 28px;
          font-weight: 800;
          color: #003399;
          margin: 6px 0;
        }

        .memories-desc {
          color: #234;
          font-size: 15px;
          margin-top: 8px;
          line-height: 1.45;
        }

        .muted {
          color: #556;
          font-size: 13px;
          margin-top: 12px;
        }

        .muted p {
          margin: 2px 0;
        }

        .right {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .artframe {
          width: 100%;
          max-width: 320px;
          aspect-ratio: 1 / 1;
          border: 6px solid #fff;
          box-shadow: 0 6px 0 #aaa;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          margin: 0 auto;
        }

        .artframe img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .caption {
          margin-top: 8px;
          font-size: 12px;
          color: #445;
          text-align: center;
        }

        /* hue animation */
        @keyframes hueSpin {
          from { filter: hue-rotate(0deg); }
          to { filter: hue-rotate(360deg); }
        }

        .hue-animate {
          animation-name: hueSpin;
          animation-iteration-count: infinite;
          animation-timing-function: linear;
          filter: hue-rotate(0deg);
        }

        /* Tablet & HP */
        @media (max-width: 880px) {
          .wrap {
            margin-top: 90px;
            padding: 10px;
          }

          .content {
            grid-template-columns: 1fr;
          }

          .right {
            margin-top: 12px;
          }

          .memories-title {
            font-size: 22px;
          }

          .memories-desc {
            font-size: 14px;
          }

          .muted {
            font-size: 12px;
          }
        }

        /* HP kecil banget */
        @media (max-width: 480px) {
          .wrap {
            margin-top: 80px;
            padding-inline: 8px;
          }

          .titlebar {
            font-size: 14px;
            padding: 6px 8px;
          }

          .left {
            padding: 6px;
          }

          .memories-title {
            font-size: 20px;
          }

          .artframe {
            max-width: 260px;
          }
        }
      `}</style>

      <Navbar />

      <main className="wrap">
        <div className="xp-window">
          <div className="titlebar">Memories</div>

          <div className="content">
            <div className="left">
              <div className="memories-title">No one will remember your name</div>
              <div className="memories-desc"></div>

              <div className="muted">
                <p style={{ marginTop: 12 }}>
                  Collection: Memories: No one will remember your name
                </p>
                <p>Suply: maybe 6666 ^^ </p>
                <p>Minting Date: TBD</p>
                <p>Chain: TBD</p>
                <p>Price: TBD</p>
              </div>
            </div>

            <aside className="right">
              <div>
                <div className="artframe">
                <img
  src={heroImage}
  alt="hero artwork"
  className="hue-animate"
  style={{ animationDuration: `${hueSeconds}s` }}
/>

                </div>
                <div className="caption"></div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
