/** Full-page beach backdrop — muted grayscale IslandDAO props behind content. */
export default function BeachAtmosphere() {
  return (
    <div className="beach-atmosphere" aria-hidden>
      <div className="beach-atmosphere__sky" />
      <div className="beach-atmosphere__horizon" />
      <div className="beach-atmosphere__ocean">
        <div className="beach-atmosphere__wave beach-atmosphere__wave--1" />
        <div className="beach-atmosphere__wave beach-atmosphere__wave--2" />
      </div>
      <div className="beach-atmosphere__sand" />
      <div className="beach-atmosphere__vignette" />

      <div className="beach-asset beach-asset--fronds-tr" />
      <div className="beach-asset beach-asset--fronds-tl" />
      <div className="beach-asset beach-asset--palm-left" />
      <div className="beach-asset beach-asset--palm-right" />
      <div className="beach-asset beach-asset--surfboards" />
      <div className="beach-asset beach-asset--umbrella" />
      <div className="beach-asset beach-asset--crab-peek" />
      <div className="beach-asset beach-asset--crab-float" />
      <div className="beach-asset beach-asset--coconut" />
    </div>
  );
}
