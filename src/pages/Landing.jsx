import { motion, useScroll, useSpring } from 'framer-motion';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Hero from '../components/landing/Hero';
import StatsStrip from '../components/landing/StatsStrip';
import Features from '../components/landing/Features';
import HowItWorks from '../components/landing/HowItWorks';
import Screenshots from '../components/landing/Screenshots';
import Testimonials from '../components/landing/Testimonials';
import FAQ from '../components/landing/FAQ';
import CTABanner from '../components/landing/CTABanner';

export default function Landing() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 26, restDelta: 0.001 });

  return (
    <div className="relative min-h-screen bg-surface dark:bg-surface-dark">
      {/* scroll progress bar */}
      <motion.div
        className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-gradient-to-r from-primary-500 to-accent-500"
        style={{ scaleX: progress }}
        aria-hidden="true"
      />

      <Navbar />

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Hero />
        <StatsStrip />
        <Features />
        <HowItWorks />
        <Screenshots />
        <Testimonials />
        <FAQ />
        <CTABanner />
      </motion.main>

      <Footer />
    </div>
  );
}

export { Landing };
