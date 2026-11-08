import TopBar from "@/components/storefront/TopBar";
import Header from "@/components/storefront/Header";
import Footer from "@/components/storefront/Footer";

export default function Home() {
  return (
    <>
      <TopBar />
      <Header />
      {/* Product rack — Step 11 */}
      <main className="min-h-[60vh]" />
      <Footer />
    </>
  );
}
