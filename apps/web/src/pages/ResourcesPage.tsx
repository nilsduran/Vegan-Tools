/**
 * @file ResourcesPage.tsx
 * @description Single-page educational and practical resource hub for veganism:
 * Ethics, environmental science, evidence-based nutrition, history & thinkers,
 * embedded documentary videos, books with purchase/affiliate links, practical diet,
 * supplements, clothing, and cruelty-free cosmetics.
 */

import { useState } from "react";
import {
  ArrowLeft,
  Cat,
  ChevronDown,
  ExternalLink,
  Globe2,
  Heart,
  Leaf,
  Rabbit,
  ShieldCheck,
  Shirt,
  ShoppingBag,
} from "lucide-react";
import { Link } from "react-router-dom";
import { tx } from "../i18n";
import { useDocumentHead } from "../utils/seo";

export function ResourcesPage() {
  useDocumentHead({
    title: tx("Resources & Philosophy"),
    description: tx(
      "A complete, evidence-based guide to veganism: philosophy, animal liberation history, embedded documentaries, books, practical nutrition, cruelty-free cosmetics, and directories.",
    ),
    path: "/resources",
    type: "article",
  });

  // State to track collapsed sections (default: all expanded)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  return (
    <div className="page resources-page">
      {/* Back Navigation */}
      <nav className="values-nav" aria-label={tx("Navigation")}>
        <Link to="/" className="values-back-link">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>{tx("Back to Home")}</span>
        </Link>
      </nav>

      {/* Hero Header */}
      <header className="resources-hero">
        <h1 className="values-title">{tx("Resources")}</h1>
        <p className="values-lead">
          {tx(
            "A complete, evidence-based guide to veganism: philosophy, animal liberation history, embedded documentaries, books, practical nutrition, cruelty-free cosmetics, and directories.",
          )}
        </p>

        {/* In-page jump navigation (History moved to bottom, Art removed) */}
        <nav className="resources-quick-nav" aria-label={tx("Sections")}>
          <a href="#why" className="quick-nav-link">
            {tx("Why")}
          </a>
          <a href="#videos" className="quick-nav-link">
            {tx("Videos")}
          </a>
          <a href="#books" className="quick-nav-link">
            {tx("Books")}
          </a>
          <a href="#practical" className="quick-nav-link">
            {tx("Practical")}
          </a>
          <a href="#history" className="quick-nav-link">
            {tx("History")}
          </a>
        </nav>
      </header>

      <div className="resources-single-page-content">
        {/* =========================================================
            SECTION 1: PER QUÈ / WHY
           ========================================================= */}
        <section id="why" className="resources-section">
          <button
            type="button"
            className="section-collapse-header"
            onClick={() => toggleSection("why")}
            aria-expanded={!collapsedSections["why"]}
            aria-controls="content-why"
          >
            <ChevronDown
              className={`collapse-chevron ${collapsedSections["why"] ? "collapsed" : ""}`}
              size={24}
              aria-hidden="true"
            />
            <div className="section-heading-wrap">
              <h2>{tx("Why")}</h2>
            </div>
          </button>

          <div
            id="content-why"
            className={`resources-section-content ${collapsedSections["why"] ? "collapsed" : ""}`}
          >
            {/* The Vegan Society Official Definition */}
            <blockquote className="the-vegan-society-definition">
              <p>
                &ldquo;{tx(
                  "Veganism is a philosophy and way of living which seeks to exclude—as far as is possible and practicable—all forms of exploitation of, and cruelty to, animals for food, clothing or any other purpose; and by extension, promotes the development and use of animal-free alternatives for the benefit of animals, humans and the environment. In dietary terms it denotes the practice of dispensing with all products derived wholly or partly from animals.",
                )}&rdquo;
              </p>
              <cite>— The Vegan Society (1979)</cite>
            </blockquote>

            <p className="section-intro-text why-core-statement">
              {tx(
                "Veganism is fundamentally about animal liberation and justice for non-human animals, not merely a personal diet.",
              )}
            </p>

            {/* 3 Pillars Image Cards: Animals (1st / Left), Planet (2nd / Middle), Health (3rd / Right) */}
            <div className="why-visual-grid">
              {/* Pillar 1: For the Animals (First / Left) */}
              <article className="why-pillar-card">
                <div className="why-pillar-img-wrap">
                  <img
                    src="https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=700&q=85"
                    alt={tx("Animals living peacefully at an animal sanctuary")}
                    loading="lazy"
                  />
                  <div className="why-pillar-badge badge-animals">
                    <Heart size={14} aria-hidden="true" />
                    <span>{tx("For the Animals")}</span>
                  </div>
                </div>
                <div className="why-pillar-content">
                  <h3>{tx("For the Animals")}</h3>
                  <p>
                    {tx(
                      "Animals possess subjective experience, form emotional bonds, feel joy and pain, and have an innate desire to live in freedom. Over 80 billion land animals and an estimated 1 to 2.8 trillion marine animals are killed every year for human consumption. Veganism recognizes animals as sentient individuals with their own moral worth, not commodities.",
                    )}
                  </p>
                  <div className="why-pillar-highlight">
                    <strong>{tx("Sentience & Moral Worth")}:</strong> {tx("Animals are someone, not something. Their lives matter to them.")}
                  </div>
                </div>
              </article>

              {/* Pillar 2: For the Planet (Middle) */}
              <article className="why-pillar-card">
                <div className="why-pillar-img-wrap">
                  <img
                    src="https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=700&q=85"
                    alt={tx("Lush natural forest ecosystem")}
                    loading="lazy"
                  />
                  <div className="why-pillar-badge badge-planet">
                    <Leaf size={14} aria-hidden="true" />
                    <span>{tx("For the Planet")}</span>
                  </div>
                </div>
                <div className="why-pillar-content">
                  <h3>{tx("For the Planet")}</h3>
                  <p>
                    {tx(
                      "Animal agriculture is a leading driver of global deforestation, freshwater depletion, habitat destruction, and greenhouse gas emissions. According to the landmark Oxford University study (Poore & Nemecek, Science, 2018), moving to a plant-based diet can reduce an individual's food carbon footprint by up to 73% and free up 75% of global farmland.",
                    )}
                  </p>
                  <div className="why-pillar-highlight">
                    <strong>Science (2018):</strong> {tx("Up to 73% reduction in dietary carbon footprint and 75% less farmland needed.")}
                  </div>
                </div>
              </article>

              {/* Pillar 3: For Health (Right) */}
              <article className="why-pillar-card">
                <div className="why-pillar-img-wrap">
                  <img
                    src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=700&q=85"
                    alt={tx("Nutrient-rich whole plant foods and vegetables")}
                    loading="lazy"
                  />
                  <div className="why-pillar-badge badge-health">
                    <ShieldCheck size={14} aria-hidden="true" />
                    <span>{tx("For Health")}</span>
                  </div>
                </div>
                <div className="why-pillar-content">
                  <h3>{tx("For Health")}</h3>
                  <p>
                    {tx(
                      "Major public health and dietetic institutions, including the British National Health Service (NHS) and the Academy of Nutrition and Dietetics, state that appropriately planned vegan diets are nutritionally adequate and suitable for all stages of life. Large epidemiological cohorts observe that dietary patterns rich in whole plant foods are associated with lower risks of cardiovascular disease and certain chronic conditions when accompanied by reliable Vitamin B12 intake.",
                    )}
                  </p>
                  <div className="why-pillar-highlight">
                    <strong>NHS & JAHA:</strong> {tx("Nutritionally adequate across all life stages when well-planned; observational associations with lower cardiovascular and chronic disease risk.")}
                  </div>
                  <p className="why-pillar-disclaimer">
                    {tx("Informational and educational purposes only. This platform does not provide medical or personalized nutritional advice. Always consult a qualified healthcare professional regarding individual health conditions or changes in diet.")}
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* =========================================================
            SECTION 2: VÍDEOS / VIDEOS (Videos & Documentaries)
           ========================================================= */}
        <section id="videos" className="resources-section">
          <button
            type="button"
            className="section-collapse-header"
            onClick={() => toggleSection("videos")}
            aria-expanded={!collapsedSections["videos"]}
            aria-controls="content-videos"
          >
            <ChevronDown
              className={`collapse-chevron ${collapsedSections["videos"] ? "collapsed" : ""}`}
              size={24}
              aria-hidden="true"
            />
            <div className="section-heading-wrap">
              <h2>{tx("Videos")}</h2>
            </div>
          </button>

          <div
            id="content-videos"
            className={`resources-section-content ${collapsedSections["videos"] ? "collapsed" : ""}`}
          >
            <p className="section-intro-text">
              {tx(
                "Watch impactful speeches, discussions, and acclaimed investigative documentaries exposing animal agriculture and exploring ethical solutions.",
              )}
            </p>

            {/* Embedded Videos: 4 videos in 2x2 grid */}
            <h3 className="resources-subsection-title">{tx("Featured Videos & Talks")}</h3>
            <div className="video-embeds-grid">
              {/* Video 1: Earthling Ed */}
              <article className="video-embed-card">
                <div className="video-responsive-wrapper">
                  <iframe
                    src="https://www.youtube-nocookie.com/embed/Z3u7hXpOm58"
                    title="You Will Never Look at Your Life in the Same Way Again — Earthling Ed"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
                <div className="video-card-info">
                  <h4>{tx("You Will Never Look at Your Life in the Same Way Again")}</h4>
                  <p>
                    {tx(
                      "Ed Winters gives one of the most compelling and empathetic philosophical lectures on animal rights and everyday choices.",
                    )}
                  </p>
                  <span className="media-badge">32 min • Earthling Ed</span>
                </div>
              </article>

              {/* Video 2: Jubilee Surrounded */}
              <article className="video-embed-card">
                <div className="video-responsive-wrapper">
                  <iframe
                    src="https://www.youtube-nocookie.com/embed/tsNBKKRXqI4"
                    title="1 Vegan vs 20 Meat Eaters — Jubilee ft. Jack Symes"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
                <div className="video-card-info">
                  <h4>{tx("1 Vegan vs 20 Meat Eaters")}</h4>
                  <p>
                    {tx(
                      "Philosopher Jack Symes addresses common carnist objections, cognitive dissonance, and cultural habits in an open dialogue.",
                    )}
                  </p>
                  <span className="media-badge">1h 38 min • Jubilee</span>
                </div>
              </article>

              {/* Video 3: kodekai */}
              <article className="video-embed-card">
                <div className="video-responsive-wrapper">
                  <iframe
                    src="https://www.youtube-nocookie.com/embed/Hcb6_44OjIo"
                    title="i went vegan as a joke... it changed me — kodekai"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
                <div className="video-card-info">
                  <h4>{tx("i went vegan as a joke... it changed me")}</h4>
                  <p>
                    {tx(
                      "A relatable personal journey starting with humor and skepticism that led to a profound, permanent lifestyle and ethical change.",
                    )}
                  </p>
                  <span className="media-badge">23 min • kodekai</span>
                </div>
              </article>

              {/* Video 4: UnJaded Jade */}
              <article className="video-embed-card">
                <div className="video-responsive-wrapper">
                  <iframe
                    src="https://www.youtube-nocookie.com/embed/KRF41taqVUI"
                    title="The Truth: Why I Went Vegan — UnJaded Jade"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
                <div className="video-card-info">
                  <h4>{tx("The Truth: Why I Went Vegan")}</h4>
                  <p>
                    {tx(
                      "An honest, grounded reflection on social dynamics, overcoming cognitive dissonance, and sustainable everyday plant-based living.",
                    )}
                  </p>
                  <span className="media-badge">21 min • UnJaded Jade</span>
                </div>
              </article>
            </div>

            {/* Visual Documentaries Posters Grid */}
            <h3 className="resources-subsection-title">{tx("Essential Documentaries")}</h3>
            <div className="doc-posters-grid">
              {/* Dominion */}
              <article className="doc-poster-card">
                <div className="doc-poster-img-wrap">
                  <img
                    src="/images/posters/dominion.jpg"
                    alt="Dominion Documentary Poster"
                    className="doc-poster-img"
                    loading="lazy"
                  />
                  <span className="doc-poster-year">2018</span>
                </div>
                <div className="doc-poster-info">
                  <h4>Dominion</h4>
                  <p>
                    {tx(
                      "Comprehensive Australian documentary utilizing drones and hidden cameras to expose six facets of human animal exploitation.",
                    )}
                  </p>
                  <a
                    href="https://watchdominion.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="doc-watch-btn"
                  >
                    <span>{tx("Watch Free")}</span>
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                </div>
              </article>

              {/* Blackfish */}
              <article className="doc-poster-card">
                <div className="doc-poster-img-wrap">
                  <img
                    src="/images/posters/blackfish.jpg"
                    alt="Blackfish Documentary Poster"
                    className="doc-poster-img"
                    loading="lazy"
                  />
                  <span className="doc-poster-year">2013</span>
                </div>
                <div className="doc-poster-info">
                  <h4>Blackfish</h4>
                  <p>
                    {tx(
                      "The psychological and physical toll of marine animal captivity, centered on orca Tilikum and SeaWorld's exploitation.",
                    )}
                  </p>
                  <a
                    href="https://www.blackfishmovie.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="doc-watch-btn"
                  >
                    <span>{tx("Learn More")}</span>
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                </div>
              </article>

              {/* Seaspiracy */}
              <article className="doc-poster-card">
                <div className="doc-poster-img-wrap">
                  <img
                    src="/images/posters/seaspiracy.jpg"
                    alt="Seaspiracy Documentary Poster"
                    className="doc-poster-img"
                    loading="lazy"
                  />
                  <span className="doc-poster-year">2021</span>
                </div>
                <div className="doc-poster-info">
                  <h4>Seaspiracy</h4>
                  <p>
                    {tx(
                      "Exposes commercial fishing industry destruction, bycatch, plastic pollution from nets, and unsustainable ocean practices.",
                    )}
                  </p>
                  <a
                    href="https://www.seaspiracy.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="doc-watch-btn"
                  >
                    <span>Netflix</span>
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                </div>
              </article>

              {/* The Game Changers */}
              <article className="doc-poster-card">
                <div className="doc-poster-img-wrap">
                  <img
                    src="/images/posters/the-game-changers.jpg"
                    alt="The Game Changers Poster"
                    className="doc-poster-img"
                    loading="lazy"
                  />
                  <span className="doc-poster-year">2018</span>
                </div>
                <div className="doc-poster-info">
                  <h4>The Game Changers</h4>
                  <p>
                    {tx(
                      "Follows elite athletes, Olympians, and scientists dispelling myths regarding animal protein, human performance, and recovery.",
                    )}
                  </p>
                  <a
                    href="https://gamechangersmovie.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="doc-watch-btn"
                  >
                    <span>{tx("Learn More")}</span>
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* =========================================================
            SECTION 3: LLIBRES / BOOKS (Real covers, cover-dominant)
           ========================================================= */}
        <section id="books" className="resources-section">
          <button
            type="button"
            className="section-collapse-header"
            onClick={() => toggleSection("books")}
            aria-expanded={!collapsedSections["books"]}
            aria-controls="content-books"
          >
            <ChevronDown
              className={`collapse-chevron ${collapsedSections["books"] ? "collapsed" : ""}`}
              size={24}
              aria-hidden="true"
            />
            <div className="section-heading-wrap">
              <h2>{tx("Books")}</h2>
            </div>
          </button>

          <div
            id="content-books"
            className={`resources-section-content ${collapsedSections["books"] ? "collapsed" : ""}`}
          >
            <p className="section-intro-text">
              {tx(
                "Foundational texts and contemporary philosophy on animal liberation, feminist ecocriticism, and moral reasoning.",
              )}
            </p>

            <div className="books-grid">
              {/* Book 1: Animal Liberation */}
              <article className="book-visual-card">
                <div className="book-cover-wrap">
                  <img
                    src="/images/books/animal-liberation.jpg"
                    alt="Animal Liberation by Peter Singer book cover"
                    className="book-cover-img"
                    loading="lazy"
                  />
                </div>
                <div className="book-details">
                  <h4 className="book-title">Animal Liberation Now</h4>
                  <p className="book-author">Peter Singer (1975 / 2023)</p>
                  <p className="book-desc">
                    {tx(
                      "The canonical philosophical treatise that popularized speciesism and sparked the modern animal rights movement.",
                    )}
                  </p>
                  <div className="book-actions">
                    <a
                      href="https://www.amazon.com/dp/0063226707?tag=vegantools-20"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-amazon-buy"
                    >
                      <ShoppingBag size={14} aria-hidden="true" />
                      <span>{tx("Buy on Amazon")}</span>
                    </a>
                  </div>
                </div>
              </article>

              {/* Book 2: The Sexual Politics of Meat */}
              <article className="book-visual-card">
                <div className="book-cover-wrap">
                  <img
                    src="/images/books/sexual-politics-of-meat.jpg"
                    alt="The Sexual Politics of Meat by Carol J. Adams book cover"
                    className="book-cover-img"
                    loading="lazy"
                  />
                </div>
                <div className="book-details">
                  <h4 className="book-title">The Sexual Politics of Meat</h4>
                  <p className="book-author">Carol J. Adams (1990)</p>
                  <p className="book-desc">
                    {tx(
                      "A feminist-vegetarian critical theory examining the interconnected oppression of women and non-human animals through the absent referent.",
                    )}
                  </p>
                  <div className="book-actions">
                    <a
                      href="https://www.amazon.com/dp/1501312839?tag=vegantools-20"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-amazon-buy"
                    >
                      <ShoppingBag size={14} aria-hidden="true" />
                      <span>{tx("Buy on Amazon")}</span>
                    </a>
                  </div>
                </div>
              </article>

              {/* Book 3: Why We Love Dogs, Eat Pigs, and Wear Cows */}
              <article className="book-visual-card">
                <div className="book-cover-wrap">
                  <img
                    src="/images/books/why-we-love-dogs.jpg"
                    alt="Why We Love Dogs, Eat Pigs, and Wear Cows by Melanie Joy book cover"
                    className="book-cover-img"
                    loading="lazy"
                  />
                </div>
                <div className="book-details">
                  <h4 className="book-title">Why We Love Dogs, Eat Pigs...</h4>
                  <p className="book-author">Dr. Melanie Joy (2009)</p>
                  <p className="book-desc">
                    {tx(
                      "Introduces the concept of carnism: the invisible belief system conditioning us to eat certain animals while loving others.",
                    )}
                  </p>
                  <div className="book-actions">
                    <a
                      href="https://www.amazon.com/dp/1573244619?tag=vegantools-20"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-amazon-buy"
                    >
                      <ShoppingBag size={14} aria-hidden="true" />
                      <span>{tx("Buy on Amazon")}</span>
                    </a>
                  </div>
                </div>
              </article>

              {/* Book 4: This Is Vegan Propaganda */}
              <article className="book-visual-card">
                <div className="book-cover-wrap">
                  <img
                    src="/images/books/this-is-vegan-propaganda.jpg"
                    alt="This Is Vegan Propaganda by Ed Winters book cover"
                    className="book-cover-img"
                    loading="lazy"
                  />
                </div>
                <div className="book-details">
                  <h4 className="book-title">This Is Vegan Propaganda</h4>
                  <p className="book-author">Ed Winters (2022)</p>
                  <p className="book-desc">
                    {tx(
                      "An indispensable, meticulously referenced guide covering climate change, antibiotic resistance, and ethical obligations.",
                    )}
                  </p>
                  <div className="book-actions">
                    <a
                      href="https://www.amazon.com/dp/1785044243?tag=vegantools-20"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-amazon-buy"
                    >
                      <ShoppingBag size={14} aria-hidden="true" />
                      <span>{tx("Buy on Amazon")}</span>
                    </a>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* =========================================================
            SECTION 4: GUIA PRÀCTICA / PRACTICAL (With Product Image)
           ========================================================= */}
        <section id="practical" className="resources-section">
          <button
            type="button"
            className="section-collapse-header"
            onClick={() => toggleSection("practical")}
            aria-expanded={!collapsedSections["practical"]}
            aria-controls="content-practical"
          >
            <ChevronDown
              className={`collapse-chevron ${collapsedSections["practical"] ? "collapsed" : ""}`}
              size={24}
              aria-hidden="true"
            />
            <div className="section-heading-wrap">
              <h2>{tx("Practical")}</h2>
            </div>
          </button>

          <div
            id="content-practical"
            className={`resources-section-content ${collapsedSections["practical"] ? "collapsed" : ""}`}
          >
            <p className="section-intro-text">
              {tx(
                "Actionable everyday guidance: essential supplements, cruelty-free personal care certifications, ethical textiles, and tools.",
              )}
            </p>

            {/* Essential Supplement Spotlight with Product Image */}
            <div className="supplement-product-card">
              <div className="supplement-img-wrap">
                <img
                  src="https://m.media-amazon.com/images/I/716DLZjX8NL.jpg"
                  alt="Vegan Vitality Multivitamins & Minerals Packaging"
                  className="supplement-product-img"
                  loading="lazy"
                />
              </div>
              <div className="supplement-info-wrap">
                <div className="supplement-badge">{tx("Essential Daily Supplement")}</div>
                <h3>Vegan Vitality Multivitamins & Minerals</h3>
                <p className="supplement-desc">
                  {tx(
                    "High-potency formula specifically engineered for vegans. Contains active Vitamin B12 (methylcobalamin), Vitamin D3 (from lichen), Iodine, Zinc, and Selenium in one daily tablet.",
                  )}
                </p>
                <ul className="supplement-points">
                  <li>
                    <strong>Vitamin B12:</strong> {tx("Vital for nervous system and red blood cells.")}
                  </li>
                  <li>
                    <strong>Vitamin D3:</strong> {tx("Plant-origin lichen D3 for bone and immune health.")}
                  </li>
                  <li>
                    <strong>Iodine & Zinc:</strong> {tx("Thyroid metabolism and skin cell turnover.")}
                  </li>
                </ul>
                <div className="supplement-actions">
                  <a
                    href="https://www.amazon.com/dp/B07DY7F868?tag=vegantools-20"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-amazon-buy"
                  >
                    <ShoppingBag size={15} aria-hidden="true" />
                    <span>{tx("Buy on Amazon")}</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="practical-subsections-grid">
              {/* Cruelty-Free Cosmetics */}
              <div className="practical-card">
                <h3>{tx("Cruelty-Free Cosmetics & Personal Care")}</h3>
                <p>
                  {tx(
                    "Not all vegan cosmetics are cruelty-free (they may be sold in regions requiring animal tests), and not all cruelty-free products are vegan (they may contain beeswax, lanolin, or carmine).",
                  )}
                </p>
                <ul className="practical-list">
                  <li>
                    <Rabbit size={16} className="practical-bullet-icon" aria-hidden="true" />
                    <div>
                      <strong>Leaping Bunny:</strong> {tx("Gold standard worldwide certification requiring independent audits.")}
                    </div>
                  </li>
                  <li>
                    <Cat size={16} className="practical-bullet-icon" aria-hidden="true" />
                    <div>
                      <strong>Cruelty-Free Kitty:</strong> {tx("Independently vetted directory of verified cruelty-free cosmetic brands.")}
                    </div>
                  </li>
                  <li>
                    <ShieldCheck size={16} className="practical-bullet-icon" aria-hidden="true" />
                    <div>
                      <strong>{tx("Independent Audits")}:</strong> {tx("Check certification seals or vetted directories rather than self-declared animal test policies.")}
                    </div>
                  </li>
                </ul>
                <div className="practical-card-links">
                  <a
                    href="https://www.crueltyfreekitty.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="practical-link"
                  >
                    <Cat size={14} aria-hidden="true" />
                    <span>Cruelty-Free Kitty</span>
                    <ExternalLink size={13} aria-hidden="true" />
                  </a>
                  <a
                    href="https://www.leapingbunny.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="practical-link"
                  >
                    <Rabbit size={14} aria-hidden="true" />
                    <span>Leaping Bunny Program</span>
                    <ExternalLink size={13} aria-hidden="true" />
                  </a>
                </div>
              </div>

              {/* Ethical Clothing & Materials */}
              <div className="practical-card">
                <h3>{tx("Clothing & Textiles")}</h3>
                <p>
                  {tx(
                    "Vegan fashion rejects leather, wool, silk, down feathers, and fur in favor of innovative, cruelty-free alternatives.",
                  )}
                </p>
                <ul className="practical-list">
                  <li>
                    <Shirt size={16} className="practical-bullet-icon" aria-hidden="true" />
                    <div>
                      <strong>Good On You:</strong> {tx("Leading independent ethical directory rating thousands of fashion brands across animal welfare, planet, and labor.")}
                    </div>
                  </li>
                  <li>
                    <ShieldCheck size={16} className="practical-bullet-icon" aria-hidden="true" />
                    <div>
                      <strong>PETA-Approved Vegan:</strong> {tx("Certification verifying entire garments, footwear, and accessories contain zero animal products.")}
                    </div>
                  </li>
                </ul>
                <div className="practical-card-links">
                  <a
                    href="https://goodonyou.eco"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="practical-link"
                  >
                    <Shirt size={14} aria-hidden="true" />
                    <span>Good On You</span>
                    <ExternalLink size={13} aria-hidden="true" />
                  </a>
                  <a
                    href="https://www.peta.org/living/personal-care-clothing/peta-approved-vegan-apparel-accessories/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="practical-link"
                  >
                    <ShieldCheck size={14} aria-hidden="true" />
                    <span>PETA-Approved Vegan</span>
                    <ExternalLink size={13} aria-hidden="true" />
                  </a>
                </div>
              </div>

              {/* Comprehensive Databases & Guides */}
              <div className="practical-card">
                <h3>{tx("Directories & Cheatsheets")}</h3>
                <p>
                  {tx(
                    "Community-curated databases providing answers for every aspect of plant-based living.",
                  )}
                </p>
                <div className="directory-buttons-stack">
                  <a
                    href="https://veganhealth.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dir-button"
                  >
                    <Globe2 size={18} className="dir-button-icon" aria-hidden="true" />
                    <div className="dir-button-text">
                      <strong className="dir-button-title">VeganHealth.org</strong>
                      <span className="dir-button-sub">{tx("Evidence-based clinical nutrient recommendations by registered dietitians")}</span>
                    </div>
                  </a>
                  <a
                    href="https://vegancheatsheet.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dir-button"
                  >
                    <Globe2 size={18} className="dir-button-icon" aria-hidden="true" />
                    <div className="dir-button-text">
                      <strong className="dir-button-title">vegancheatsheet.org</strong>
                      <span className="dir-button-sub">{tx("Hundreds of scientific studies, debates, guides & recipes")}</span>
                    </div>
                  </a>
                  <a
                    href="https://veganuary.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dir-button"
                  >
                    <Globe2 size={18} className="dir-button-icon" aria-hidden="true" />
                    <div className="dir-button-text">
                      <strong className="dir-button-title">Veganuary Starter Kit</strong>
                      <span className="dir-button-sub">{tx("Free 31-day meal plans, grocery shopping lists & tips")}</span>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            SECTION 5: HISTÒRIA / HISTORY (Moved to bottom)
           ========================================================= */}
        <section id="history" className="resources-section">
          <button
            type="button"
            className="section-collapse-header"
            onClick={() => toggleSection("history")}
            aria-expanded={!collapsedSections["history"]}
            aria-controls="content-history"
          >
            <ChevronDown
              className={`collapse-chevron ${collapsedSections["history"] ? "collapsed" : ""}`}
              size={24}
              aria-hidden="true"
            />
            <div className="section-heading-wrap">
              <h2>{tx("History")}</h2>
            </div>
          </button>

          <div
            id="content-history"
            className={`resources-section-content ${collapsedSections["history"] ? "collapsed" : ""}`}
          >
            <p className="section-intro-text">
              {tx(
                "From ancient philosophical roots to modern moral theory, compassion for non-human animals has evolved through centuries of rigorous debate.",
              )}
            </p>

            <div className="history-timeline">
              {/* Event 1: Antiquity */}
              <div className="timeline-item">
                <div className="timeline-marker" />
                <div className="timeline-content">
                  <span className="timeline-date">c. 500 BCE</span>
                  <h4>{tx("Antiquity & Ahimsa")}</h4>
                  <p>
                    {tx(
                      "Pythagoras in ancient Greece advocated respect for all living beings, while Jainism and early Buddhist traditions developed the doctrine of Ahimsa (non-violence towards all sentient creatures).",
                    )}
                  </p>
                </div>
              </div>

              {/* Event 2: Coining of Veganism */}
              <div className="timeline-item">
                <div className="timeline-marker" />
                <div className="timeline-content">
                  <span className="timeline-date">1944</span>
                  <h4>{tx("Coining of 'Vegan' — Donald Watson & Elsie Shrigley")}</h4>
                  <p>
                    {tx(
                      "In November 1944 in Leicester (UK), Donald Watson, Elsie Shrigley, and four friends founded The Vegan Society, coining the word 'vegan' using the first three and last two letters of 'vegetarian'.",
                    )}
                  </p>
                  <blockquote className="timeline-quote">
                    "{tx(
                      "Veganism is a philosophy and way of living which seeks to exclude—as far as is possible and practicable—all forms of exploitation of, and cruelty to, animals for food, clothing or any other purpose; and by extension, promotes the development and use of animal-free alternatives for the benefit of animals, humans and the environment. In dietary terms it denotes the practice of dispensing with all products derived wholly or partly from animals.",
                    )}"
                    <footer>— The Vegan Society Definition</footer>
                  </blockquote>
                </div>
              </div>

              {/* Event 3: Animal Liberation */}
              <div className="timeline-item">
                <div className="timeline-marker" />
                <div className="timeline-content">
                  <span className="timeline-date">1975</span>
                  <h4>{tx("Animal Liberation & Utilitarianism — Peter Singer")}</h4>
                  <p>
                    {tx(
                      "Publication of 'Animal Liberation' introduced rigorous utilitarian ethics against speciesism: if a being suffers, there can be no moral justification for refusing to take that suffering into consideration.",
                    )}
                  </p>
                </div>
              </div>

              {/* Event 4: Feminist Ecocriticism & Carnism */}
              <div className="timeline-item">
                <div className="timeline-marker" />
                <div className="timeline-content">
                  <span className="timeline-date">1990 – 2009</span>
                  <h4>{tx("Feminist Ecocriticism & Carnism — Adams & Joy")}</h4>
                  <p>
                    {tx(
                      "Carol J. Adams published 'The Sexual Politics of Meat' (1990), demonstrating how patriarchal culture reduces animals and marginalized bodies to consumable parts. In 2009, social psychologist Dr. Melanie Joy coined 'Carnism' to explain the invisible ideology that conditions us to consume animals.",
                    )}
                  </p>
                </div>
              </div>

              {/* Event 5: Contemporary Debate */}
              <div className="timeline-item">
                <div className="timeline-marker" />
                <div className="timeline-content">
                  <span className="timeline-date">{tx("Present")}</span>
                  <h4>{tx("Modern Debate & Epistemology — Ed Winters & Jack Symes")}</h4>
                  <p>
                    {tx(
                      "Contemporary advocates like Ed Winters ('Earthling Ed') and philosophers like Jack Symes engage public discourse through street epistemology, academic publications, and university debates.",
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Amazon Affiliate Legal Disclaimer */}
      <footer className="amazon-affiliate-disclaimer">
        <p>
          {tx(
            "As an Amazon Associate I earn from qualifying purchases. This means that if you click on an affiliate link and make a purchase, we may receive a small commission at no additional cost to you.",
          )}
        </p>
      </footer>
    </div>
  );
}
