import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  GoogleSignin,
  isSuccessResponse,
} from "@react-native-google-signin/google-signin";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID,
  clearAuthentication,
  exchangeGoogleIdToken,
  getCurrentUser,
  getProducts,
  setAuthenticationExpiredHandler,
  startCheckout,
  type Product,
  type StoreUser,
} from "./src/api";

if (GOOGLE_WEB_CLIENT_ID) {
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    ...(GOOGLE_IOS_CLIENT_ID ? { iosClientId: GOOGLE_IOS_CLIENT_ID } : {}),
    offlineAccess: false,
  });
}

type CartItem = { product: Product; quantity: number };
type Screen = "shop" | "bag" | "account" | "checkout";

const colors = {
  ink: "#28352d",
  muted: "#77796f",
  paper: "#f8f7f2",
  white: "#fffefa",
  line: "#e7e5dc",
  green: "#344238",
  paleGreen: "#e8ebe3",
  orange: "#a97f57",
};

function money(value: number): string {
  return `₦${value.toLocaleString("en-NG")}`;
}

function getPaymentUrl(result: Awaited<ReturnType<typeof startCheckout>>): string | undefined {
  return (
    result.authorizationUrl ??
    result.authorization_url ??
    result.checkoutUrl ??
    result.checkout_url ??
    result.paymentUrl ??
    result.payment_url ??
    result.url ??
    result.payment?.authorizationUrl ??
    result.payment?.authorization_url ??
    result.payment?.checkoutUrl ??
    result.payment?.checkout_url ??
    result.payment?.url
  );
}

function ProductCard({
  product,
  onPress,
}: {
  product: Product;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.productCard} accessibilityRole="button">
      <View style={styles.productImageWrap}>
        <Image source={{ uri: product.image }} style={styles.productImage} />
        <View style={styles.categoryPill}>
          <Text style={styles.categoryPillText}>{product.category}</Text>
        </View>
      </View>
      <Text numberOfLines={1} style={styles.productName}>
        {product.name}
      </Text>
      <View style={styles.productMeta}>
        <Text style={styles.productPrice}>{money(product.price)}</Text>
        <Text style={styles.stockText}>
          {product.stock > 0 ? "In stock" : "Sold out"}
        </Text>
      </View>
    </Pressable>
  );
}

export default function App() {
  const shopListRef = useRef<FlatList<Product>>(null);
  const collectionOffset = useRef(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [user, setUser] = useState<StoreUser | null>(null);
  const [screen, setScreen] = useState<Screen>("shop");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [address, setAddress] = useState("");

  async function loadStore(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    const [productResult, userResult] = await Promise.allSettled([
      getProducts(),
      getCurrentUser(),
    ]);
    if (productResult.status === "fulfilled") {
      setProducts(productResult.value);
    } else {
      setError(
        productResult.reason instanceof Error
          ? productResult.reason.message
          : "Could not load the store. Please try again.",
      );
    }
    if (userResult.status === "fulfilled") {
      setUser(userResult.value);
      if (userResult.value?.name) setCustomerName(userResult.value.name);
      if (userResult.value?.email) setCustomerEmail(userResult.value.email);
    } else {
      setError(
        userResult.reason instanceof Error
          ? userResult.reason.message
          : "Could not restore your account. Please try again.",
      );
    }
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    setAuthenticationExpiredHandler(() => {
      setUser(null);
      setNotice("Your session expired. Please sign in again.");
    });
    return () => setAuthenticationExpiredHandler(undefined);
  }, []);

  useEffect(() => {
    void loadStore();
  }, []);

  const categories = useMemo(
    () => ["All", ...new Set(products.map((product) => product.category))],
    [products],
  );
  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = category === "All" || product.category === category;
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [category, products, search]);
  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cart.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0,
  );

  function addToCart(product: Product, quantity = 1) {
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (!existing) return [...current, { product, quantity }];
      return current.map((item) =>
        item.product.id === product.id
          ? { ...item, quantity: Math.min(item.quantity + quantity, product.stock) }
          : item,
      );
    });
    setSelectedProduct(null);
    setNotice(`${product.name} added to your bag.`);
    setScreen("shop");
  }

  function changeQuantity(productId: string, amount: number) {
    setCart((current) =>
      current
        .map((item) =>
          item.product.id === productId
            ? {
                ...item,
                quantity: Math.min(item.product.stock, item.quantity + amount),
              }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  async function signInWithGoogle() {
    setAuthBusy(true);
    setError("");
    setNotice("");
    try {
      if (
        !GOOGLE_WEB_CLIENT_ID ||
        (Platform.OS === "ios" && !GOOGLE_IOS_CLIENT_ID)
      ) {
        throw new Error(
          "Google sign-in is not configured. Set the public Google OAuth client IDs and rebuild the app.",
        );
      }
      if (Platform.OS === "android") {
        const hasPlayServices = await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });
        if (!hasPlayServices) {
          throw new Error("Google Play Services are required to sign in.");
        }
      }

      const googleResponse = await GoogleSignin.signIn();
      if (!isSuccessResponse(googleResponse)) {
        setNotice("Google sign-in was cancelled.");
        return;
      }
      const idToken = googleResponse.data.idToken;
      if (!idToken) {
        throw new Error("Google sign-in did not return an ID token. Please try again.");
      }
      const signedInUser = await exchangeGoogleIdToken(idToken);
      setUser(signedInUser);
      setCustomerName(signedInUser.name ?? "");
      setCustomerEmail(signedInUser.email ?? "");
      setNotice(`Welcome${signedInUser.name ? `, ${signedInUser.name}` : " back"}!`);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Google sign-in could not be started.",
      );
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() {
    setAuthBusy(true);
    setError("");
    setNotice("");
    setUser(null);
    setCustomerName("");
    setCustomerEmail("");
    setScreen("account");
    try {
      await clearAuthentication();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? `Your local account was cleared, but secure credentials could not be removed: ${reason.message}`
          : "Your local account was cleared, but secure credentials could not be removed.",
      );
      setAuthBusy(false);
      return;
    }

    try {
      await GoogleSignin.signOut();
      setNotice("You have been signed out.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? `You are signed out of Cedar & Loom, but Google sign-out could not be completed: ${reason.message}`
          : "You are signed out of Cedar & Loom, but Google sign-out could not be completed.",
      );
    } finally {
      setAuthBusy(false);
    }
  }

  async function submitCheckout() {
    const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim());
    if (!customerName.trim() || !emailIsValid || !address.trim()) {
      setError("Add your name, a valid email address, and a delivery address to continue.");
      return;
    }
    if (!user) {
      setError("Sign in with Google before placing your order.");
      return;
    }
    if (!cart.length) {
      setError("Your bag is empty.");
      return;
    }

    setCheckoutBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await startCheckout({
        items: cart.map(({ product, quantity }) => ({
          productId: product.id,
          quantity,
        })),
        customer: { name: customerName.trim(), email: customerEmail.trim() },
        shippingAddress: address.trim(),
      });
      const paymentUrl = getPaymentUrl(result);
      if (!paymentUrl || !/^https:\/\//i.test(paymentUrl)) {
        throw new Error("The store did not return a secure Paystack checkout link.");
      }
      await WebBrowser.openBrowserAsync(paymentUrl);
      setNotice(
        "Your secure payment page opened. Your order email will be sent after payment is confirmed.",
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Checkout could not be completed.",
      );
    } finally {
      setCheckoutBusy(false);
    }
  }

  function goToCheckout() {
    setError("");
    if (!user) {
      setNotice("Sign in with Google to securely continue to checkout.");
      setScreen("account");
      return;
    }
    setScreen("checkout");
  }

  function renderShop() {
    return (
      <FlatList
        ref={shopListRef}
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.productRow}
        contentContainerStyle={styles.shopContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadStore(true)}
            tintColor={colors.green}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>A LITTLE MORE CONSIDERED</Text>
              <Text style={styles.heroTitle}>Make room{"\n"}for <Text style={styles.heroTitleItalic}>meaning.</Text></Text>
              <Text style={styles.heroCopy}>
                Objects for everyday rituals, gathered from makers who believe the
                things we live with should feel as good as they look.
              </Text>
              <Pressable
                onPress={() => {
                  setCategory("All");
                  setSearch("");
                  shopListRef.current?.scrollToOffset({
                    offset: collectionOffset.current,
                    animated: true,
                  });
                }}
                style={styles.heroLink}
                accessibilityRole="button"
              >
                <Text style={styles.heroLinkText}>Explore the collection</Text>
                <Text style={styles.heroLinkArrow}>↗</Text>
              </Pressable>
              <Text style={styles.heroFootnote}>Thoughtfully sourced, always</Text>
            </View>
            <View style={styles.heroImageFrame}>
              <ImageBackground
                source={{
                  uri: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=85",
                }}
                style={styles.heroImage}
                imageStyle={styles.heroImageStyle}
                accessibilityLabel="Sunlit, thoughtfully styled living space with natural textures"
              >
                <View style={styles.heroImageCaption}>
                  <Text style={styles.heroImageCaptionText}>AT HOME WITH THE EVERYDAY</Text>
                  <Text style={styles.heroImageCount}>01 / 03</Text>
                </View>
              </ImageBackground>
            </View>
            <View style={styles.brandStatement}>
              <Text style={styles.brandStatementText}>
                Objects with a point of view.{"\n"}Made with time, kept for longer.
              </Text>
              <Text style={styles.brandStamp}>C&L{"\n"}EST. 2024</Text>
            </View>
            <View
              style={styles.sectionHeading}
              onLayout={(event) => {
                collectionOffset.current = event.nativeEvent.layout.y;
              }}
            >
              <View>
                <Text style={styles.sectionEyebrow}>FIND YOUR EVERYDAY</Text>
                <Text style={styles.sectionTitle}>A few good things</Text>
              </View>
              <Pressable
                onPress={() => {
                  setCategory("All");
                  setSearch("");
                  shopListRef.current?.scrollToOffset({
                    offset: collectionOffset.current,
                    animated: true,
                  });
                }}
                accessibilityRole="button"
              >
                <Text style={styles.shopEverything}>Shop everything  ↗</Text>
              </Pressable>
            </View>
            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search the collection"
                placeholderTextColor={colors.muted}
                style={styles.searchInput}
                accessibilityLabel="Search products"
                returnKeyType="search"
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch("")} accessibilityLabel="Clear search">
                  <Text style={styles.clearSearch}>×</Text>
                </Pressable>
              )}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categories}
            >
              {categories.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setCategory(item)}
                  style={[styles.categoryChip, category === item && styles.categoryChipActive]}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      category === item && styles.categoryTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Nothing here just yet</Text>
            <Text style={styles.emptyCopy}>Try another search or browse a different collection.</Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.storySection}>
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1100&q=85",
              }}
              style={styles.storyImage}
              accessibilityLabel="Handmade objects and organic materials in a quiet home"
            />
            <View style={styles.storyContent}>
              <Text style={styles.sectionEyebrow}>THE CEDAR & LOOM WAY</Text>
              <Text style={styles.storyTitle}>
                Good things take{"\n"}their time.
              </Text>
              <Text style={styles.storyCopy}>
                We believe a home is made in the little moments. Honest materials,
                independent makers, and beauty that doesn't need to shout.
              </Text>
              <View style={styles.valuesList}>
                <View style={styles.valueItem}>
                  <Text style={styles.valueNumber}>01</Text>
                  <View style={styles.valueCopy}>
                    <Text style={styles.valueTitle}>Natural by nature</Text>
                    <Text style={styles.valueDescription}>Honest materials, chosen with care.</Text>
                  </View>
                </View>
                <View style={styles.valueItem}>
                  <Text style={styles.valueNumber}>02</Text>
                  <View style={styles.valueCopy}>
                    <Text style={styles.valueTitle}>Made to be kept</Text>
                    <Text style={styles.valueDescription}>Thoughtful pieces for everyday living.</Text>
                  </View>
                </View>
                <View style={styles.valueItem}>
                  <Text style={styles.valueNumber}>03</Text>
                  <View style={styles.valueCopy}>
                    <Text style={styles.valueTitle}>Less, but better</Text>
                    <Text style={styles.valueDescription}>Small-batch finds with a lighter footprint.</Text>
                  </View>
                </View>
              </View>
              <View style={styles.storyCta}>
                <Text style={styles.storyCtaEyebrow}>FOR THE LIFE YOU LIVE</Text>
                <Text style={styles.storyCtaTitle}>Keep good company.</Text>
                <Pressable
                  onPress={() => {
                    setCategory("All");
                    setSearch("");
                  }}
                  style={styles.storyCtaLink}
                  accessibilityRole="button"
                >
                  <Text style={styles.storyCtaLinkText}>Find your something  ↗</Text>
                </Pressable>
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <ProductCard product={item} onPress={() => setSelectedProduct(item)} />
        )}
      />
    );
  }

  function renderBag() {
    return (
      <ScrollView
        contentContainerStyle={styles.pageContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadStore(true)}
            tintColor={colors.green}
          />
        }
      >
        <Text style={styles.eyebrow}>YOUR GOOD THINGS</Text>
        <Text style={styles.pageTitle}>Your bag</Text>
        {!cart.length ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>◌</Text>
            <Text style={styles.emptyTitle}>Your bag is taking a breather.</Text>
            <Text style={styles.emptyCopy}>Find something you love and it’ll be right here.</Text>
            <Pressable style={styles.primaryButton} onPress={() => setScreen("shop")}>
              <Text style={styles.primaryButtonText}>Explore the collection</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {cart.map(({ product, quantity }) => (
              <View key={product.id} style={styles.cartRow}>
                <Image source={{ uri: product.image }} style={styles.cartImage} />
                <View style={styles.cartDescription}>
                  <Text style={styles.productCategory}>{product.category}</Text>
                  <Text style={styles.cartName}>{product.name}</Text>
                  <Text style={styles.productPrice}>{money(product.price)}</Text>
                  <View style={styles.quantityControl}>
                    <Pressable
                      onPress={() => changeQuantity(product.id, -1)}
                      style={styles.quantityButton}
                      accessibilityLabel={`Remove one ${product.name}`}
                    >
                      <Text style={styles.quantityButtonText}>−</Text>
                    </Pressable>
                    <Text style={styles.quantityValue}>{quantity}</Text>
                    <Pressable
                      onPress={() => changeQuantity(product.id, 1)}
                      disabled={quantity >= product.stock}
                      style={styles.quantityButton}
                      accessibilityLabel={`Add one ${product.name}`}
                    >
                      <Text style={styles.quantityButtonText}>+</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
            <View style={styles.summary}>
              <View style={styles.summaryLine}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{money(subtotal)}</Text>
              </View>
              <Text style={styles.summaryNote}>Delivery is calculated at checkout.</Text>
              <Pressable style={styles.primaryButton} onPress={goToCheckout}>
                <Text style={styles.primaryButtonText}>Continue to checkout</Text>
                <Text style={styles.buttonArrow}>→</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    );
  }

  function renderAccount() {
    return (
      <ScrollView contentContainerStyle={styles.pageContent}>
        <Text style={styles.eyebrow}>A PLACE FOR YOUR FAVOURITES</Text>
        <Text style={styles.pageTitle}>Your account</Text>
        <View style={styles.accountCard}>
          <View style={styles.accountMark}>
            <Text style={styles.accountMarkText}>
              {user?.name?.slice(0, 1).toUpperCase() ?? "C"}
            </Text>
          </View>
          <Text style={styles.accountTitle}>
            {user ? `Hello, ${user.name ?? "friend"}` : "Make yourself at home"}
          </Text>
          <Text style={styles.accountCopy}>
            {user?.email ??
              "Sign in to keep your order details together and make checkout a little easier."}
          </Text>
          {user ? (
            <>
              <View style={styles.signedInPill}>
                <Text style={styles.signedInText}>✓  Signed in with Google</Text>
              </View>
              <Pressable
                onPress={() => void signOut()}
                disabled={authBusy}
                style={[styles.signOutButton, authBusy && styles.buttonDisabled]}
                accessibilityRole="button"
              >
                {authBusy ? (
                  <ActivityIndicator color={colors.ink} />
                ) : (
                  <Text style={styles.signOutButtonText}>Sign out</Text>
                )}
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={() => void signInWithGoogle()}
              disabled={authBusy}
              style={[styles.googleButton, authBusy && styles.buttonDisabled]}
            >
              {authBusy ? (
                <ActivityIndicator color={colors.ink} />
              ) : (
                <>
                  <Text style={styles.googleMark}>G</Text>
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>✳</Text>
          <View style={styles.infoTextWrap}>
            <Text style={styles.infoTitle}>A thoughtful checkout</Text>
            <Text style={styles.infoCopy}>
              Payments are securely handled by Paystack. Order updates and receipts are
              sent to your email by the store.
            </Text>
          </View>
        </View>
        <Text style={styles.accountFootnote}>
          Sign in securely with Google. Your app authentication tokens are stored
          encrypted on this device.
        </Text>
      </ScrollView>
    );
  }

  function renderCheckout() {
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled">
          <Pressable style={styles.backButton} onPress={() => setScreen("bag")}>
            <Text style={styles.backButtonText}>←  Back to bag</Text>
          </Pressable>
          <Text style={styles.eyebrow}>ALMOST YOURS</Text>
          <Text style={styles.pageTitle}>Delivery details</Text>
          <View style={styles.form}>
            <Text style={styles.inputLabel}>FULL NAME</Text>
            <TextInput
              value={customerName}
              onChangeText={setCustomerName}
              style={styles.textInput}
              placeholder="Your name"
              placeholderTextColor={colors.muted}
              autoComplete="name"
              returnKeyType="next"
            />
            <Text style={styles.inputLabel}>EMAIL FOR YOUR RECEIPT</Text>
            <TextInput
              value={customerEmail}
              onChangeText={setCustomerEmail}
              style={styles.textInput}
              placeholder="you@example.com"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="next"
            />
            <Text style={styles.inputLabel}>DELIVERY ADDRESS</Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              style={[styles.textInput, styles.addressInput]}
              placeholder="Street, city, state"
              placeholderTextColor={colors.muted}
              multiline
              textAlignVertical="top"
              autoComplete="street-address"
            />
          </View>
          <View style={styles.checkoutSummary}>
            <View style={styles.summaryLine}>
              <Text style={styles.summaryLabel}>Subtotal · {itemCount} items</Text>
              <Text style={styles.summaryValue}>{money(subtotal)}</Text>
            </View>
            <Text style={styles.summaryNote}>
              Secure payment powered by Paystack. Delivery is calculated by the store.
            </Text>
            <Pressable
              style={[styles.primaryButton, checkoutBusy && styles.buttonDisabled]}
              disabled={checkoutBusy}
              onPress={() => void submitCheckout()}
            >
              {checkoutBusy ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Continue to payment</Text>
                  <Text style={styles.buttonArrow}>→</Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  const activeScreen = screen === "shop" || screen === "bag" || screen === "account";

  return (
    <View style={styles.app}>
      <StatusBar style="dark" />
      <View style={styles.topNote}>
        <Text style={styles.topNoteText}>
          OBJECTS FOR A SLOWER, MORE THOUGHTFUL HOME  ·  COMPLIMENTARY DELIVERY
        </Text>
      </View>
      <View style={styles.header}>
        <Pressable onPress={() => setScreen("shop")} style={styles.wordmark}>
          <View style={styles.brandMonogram}>
            <Text style={styles.brandMonogramText}>c.</Text>
          </View>
          <View>
            <Text style={styles.wordmarkMain}>Cedar & Loom</Text>
            <Text style={styles.wordmarkSub}>THOUGHTFUL LIVING</Text>
          </View>
        </Pressable>
        <Pressable
          onPress={() => setScreen("bag")}
          style={styles.bagButton}
          accessibilityRole="button"
          accessibilityLabel={`Shopping bag with ${itemCount} items`}
        >
          <Text style={styles.bagGlyph}>♧</Text>
          {itemCount > 0 && (
            <View style={styles.bagCount}>
              <Text style={styles.bagCountText}>{itemCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {error ? (
        <View style={styles.messageError}>
          <Text style={styles.messageText}>{error}</Text>
          <Pressable onPress={() => setError("")} accessibilityLabel="Dismiss error">
            <Text style={styles.messageClose}>×</Text>
          </Pressable>
        </View>
      ) : null}
      {notice ? (
        <View style={styles.messageNotice}>
          <Text style={styles.messageText}>{notice}</Text>
          <Pressable onPress={() => setNotice("")} accessibilityLabel="Dismiss message">
            <Text style={styles.messageClose}>×</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.main}>
        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.green} />
            <Text style={styles.loadingText}>Gathering the good things…</Text>
          </View>
        ) : error && products.length === 0 ? (
          <View style={styles.loadingState}>
            <Text style={styles.emptyTitle}>The collection is taking a moment.</Text>
            <Pressable style={styles.primaryButton} onPress={() => void loadStore()}>
              <Text style={styles.primaryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : screen === "shop" ? (
          renderShop()
        ) : screen === "bag" ? (
          renderBag()
        ) : screen === "account" ? (
          renderAccount()
        ) : (
          renderCheckout()
        )}
      </View>

      {activeScreen && !loading && (
        <View style={styles.tabBar}>
          <Pressable
            onPress={() => setScreen("shop")}
            style={styles.tabButton}
            accessibilityRole="button"
          >
            <Text style={[styles.tabIcon, screen === "shop" && styles.tabIconActive]}>⌂</Text>
            <Text style={[styles.tabLabel, screen === "shop" && styles.tabLabelActive]}>Shop</Text>
          </Pressable>
          <Pressable onPress={() => setScreen("bag")} style={styles.tabButton}>
            <View>
              <Text style={[styles.tabIcon, screen === "bag" && styles.tabIconActive]}>▱</Text>
              {itemCount > 0 && <View style={styles.tabDot} />}
            </View>
            <Text style={[styles.tabLabel, screen === "bag" && styles.tabLabelActive]}>Your bag</Text>
          </Pressable>
          <Pressable onPress={() => setScreen("account")} style={styles.tabButton}>
            <Text style={[styles.tabIcon, screen === "account" && styles.tabIconActive]}>○</Text>
            <Text style={[styles.tabLabel, screen === "account" && styles.tabLabelActive]}>
              Account
            </Text>
          </Pressable>
        </View>
      )}

      <Modal
        visible={selectedProduct !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedProduct(null)}
      >
        {selectedProduct && (
          <View style={styles.modal}>
            <ScrollView bounces={false}>
              <View style={styles.detailImageWrap}>
                <Image source={{ uri: selectedProduct.image }} style={styles.detailImage} />
                <Pressable
                  onPress={() => setSelectedProduct(null)}
                  style={styles.modalClose}
                  accessibilityLabel="Close product details"
                >
                  <Text style={styles.modalCloseText}>×</Text>
                </Pressable>
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.eyebrow}>{selectedProduct.category.toUpperCase()}</Text>
                <Text style={styles.detailTitle}>{selectedProduct.name}</Text>
                <Text style={styles.detailPrice}>{money(selectedProduct.price)}</Text>
                <Text style={styles.detailDescription}>{selectedProduct.description}</Text>
                <Text style={styles.detailStock}>
                  {selectedProduct.stock > 0
                    ? `${selectedProduct.stock} available · Ready to find a home`
                    : "Currently sold out"}
                </Text>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <Pressable
                onPress={() => addToCart(selectedProduct)}
                disabled={selectedProduct.stock < 1}
                style={[
                  styles.primaryButton,
                  selectedProduct.stock < 1 && styles.buttonDisabled,
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  {selectedProduct.stock > 0 ? "Add to your bag" : "Sold out"}
                </Text>
                <Text style={styles.buttonArrow}>→</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  topNote: {
    minHeight: 26,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.green,
    paddingHorizontal: 16,
  },
  topNoteText: { color: "#f3f1e9", fontSize: 7, letterSpacing: 0.65, fontWeight: "500", textAlign: "center" },
  header: {
    height: 72,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.paper,
  },
  wordmark: { flexDirection: "row", alignItems: "center", gap: 9 },
  brandMonogram: { width: 37, height: 37, borderRadius: 20, borderWidth: 1, borderColor: "#bcbcae", alignItems: "center", justifyContent: "center" },
  brandMonogramText: { color: colors.green, fontFamily: "Georgia", fontSize: 20, fontStyle: "italic" },
  wordmarkMain: { color: colors.ink, fontFamily: "Georgia", fontSize: 19, lineHeight: 23 },
  wordmarkSub: { color: colors.muted, fontSize: 6, letterSpacing: 1.5, marginTop: 1 },
  bagButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
  },
  bagGlyph: { color: colors.ink, fontSize: 21, lineHeight: 24 },
  bagCount: {
    position: "absolute",
    right: -3,
    top: -3,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: colors.orange,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  bagCountText: { color: "white", fontSize: 9, fontWeight: "700" },
  main: { flex: 1 },
  shopContent: { paddingBottom: 0, paddingHorizontal: 0 },
  hero: {
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 23,
    backgroundColor: "#efeee6",
  },
  eyebrow: { color: colors.muted, fontSize: 8, letterSpacing: 1.6, fontWeight: "600" },
  heroTitle: { color: colors.ink, fontFamily: "Georgia", fontSize: 40, lineHeight: 44, letterSpacing: -1.8, marginTop: 13 },
  heroTitleItalic: { color: "#748173", fontStyle: "italic" },
  heroCopy: { color: "#686b60", fontSize: 12, lineHeight: 19, maxWidth: 320, marginTop: 13 },
  heroLink: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", borderBottomWidth: 1, borderBottomColor: colors.green, paddingBottom: 7, marginTop: 19, gap: 18 },
  heroLinkText: { color: colors.green, fontSize: 11, fontWeight: "600" },
  heroLinkArrow: { color: colors.green, fontSize: 14 },
  heroFootnote: { color: colors.muted, fontSize: 9, marginTop: 15 },
  heroImageFrame: { paddingHorizontal: 12, paddingBottom: 12, backgroundColor: "#efeee6" },
  heroImage: { height: 235, justifyContent: "flex-end", backgroundColor: "#dad8ce" },
  heroImageStyle: { resizeMode: "cover" },
  heroImageCaption: { minHeight: 36, paddingHorizontal: 12, backgroundColor: "rgba(40,53,45,0.78)", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroImageCaptionText: { color: colors.white, fontSize: 7, letterSpacing: 1.2 },
  heroImageCount: { color: colors.white, fontSize: 8, letterSpacing: 1 },
  brandStatement: { minHeight: 116, paddingHorizontal: 23, paddingVertical: 21, borderBottomWidth: 1, borderBottomColor: colors.line, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brandStatementText: { color: colors.ink, fontFamily: "Georgia", fontSize: 17, lineHeight: 24, fontStyle: "italic" },
  brandStamp: { color: colors.muted, fontFamily: "Georgia", fontSize: 9, letterSpacing: 1.4, textAlign: "center", lineHeight: 16 },
  sectionEyebrow: { color: colors.muted, fontSize: 8, letterSpacing: 1.4, marginBottom: 7 },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginTop: 29,
    marginBottom: 17,
  },
  sectionTitle: { color: colors.ink, fontFamily: "Georgia", fontSize: 25, letterSpacing: -0.5 },
  sectionCaption: { color: colors.muted, fontSize: 11, marginTop: 4 },
  itemTotal: { color: colors.muted, fontSize: 10, marginBottom: 3 },
  shopEverything: { color: colors.green, fontSize: 8, borderBottomWidth: 1, borderBottomColor: "#aaa99e", paddingBottom: 5 },
  searchBox: {
    height: 44,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 13,
    marginHorizontal: 20,
  },
  searchIcon: { color: colors.muted, fontSize: 24, lineHeight: 28, marginRight: 8 },
  searchInput: { flex: 1, color: colors.ink, fontSize: 12, paddingVertical: 0 },
  clearSearch: { color: colors.muted, fontSize: 22, paddingHorizontal: 5 },
  categories: { gap: 7, paddingBottom: 18, paddingHorizontal: 20 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  categoryChipActive: { backgroundColor: colors.green, borderColor: colors.green },
  categoryText: { color: "#56584e", fontSize: 10 },
  categoryTextActive: { color: "white" },
  productRow: { gap: 12, marginBottom: 22, paddingHorizontal: 20 },
  productCard: { flex: 1, minWidth: 0 },
  productImageWrap: { height: 204, backgroundColor: "#e9e6df", position: "relative" },
  productImage: { width: "100%", height: "100%", resizeMode: "cover" },
  categoryPill: {
    position: "absolute",
    left: 8,
    top: 8,
    backgroundColor: "rgba(255,254,250,0.91)",
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  categoryPillText: { color: colors.green, fontSize: 7, letterSpacing: 0.7, textTransform: "uppercase" },
  productMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 5 },
  stockText: { color: colors.muted, fontSize: 8 },
  productCategory: { color: colors.muted, fontSize: 9, letterSpacing: 0.5, marginTop: 9 },
  productName: { color: colors.ink, fontFamily: "Georgia", fontSize: 13, marginTop: 9 },
  productPrice: { color: colors.ink, fontSize: 11, fontWeight: "500" },
  storySection: { marginTop: 28, backgroundColor: "#efeee6" },
  storyImage: { width: "100%", height: 235, backgroundColor: "#dfddd3" },
  storyContent: { paddingHorizontal: 22, paddingTop: 25, paddingBottom: 20 },
  storyTitle: { color: colors.ink, fontFamily: "Georgia", fontSize: 31, lineHeight: 36, marginTop: 8 },
  storyCopy: { color: "#686b60", fontSize: 11, lineHeight: 18, marginTop: 11 },
  valuesList: { marginTop: 20, borderTopWidth: 1, borderTopColor: "#d7d6cd" },
  valueItem: { flexDirection: "row", paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#d7d6cd", gap: 14 },
  valueNumber: { color: colors.orange, fontFamily: "Georgia", fontSize: 12 },
  valueCopy: { flex: 1 },
  valueTitle: { color: colors.ink, fontFamily: "Georgia", fontSize: 14 },
  valueDescription: { color: colors.muted, fontSize: 9, marginTop: 4 },
  storyCta: { padding: 19, marginTop: 21, backgroundColor: colors.green },
  storyCtaEyebrow: { color: "#c6c9bd", fontSize: 8, letterSpacing: 1.4 },
  storyCtaTitle: { color: colors.white, fontFamily: "Georgia", fontSize: 25, marginTop: 9 },
  storyCtaLink: { alignSelf: "flex-start", marginTop: 16, borderBottomWidth: 1, borderBottomColor: "#aeb7aa", paddingBottom: 5 },
  storyCtaLinkText: { color: colors.white, fontSize: 10 },
  emptyState: { alignItems: "center", paddingHorizontal: 25, paddingVertical: 42 },
  emptyIcon: { color: "#abb7aa", fontSize: 45, marginBottom: 10 },
  emptyTitle: { color: colors.ink, fontSize: 17, fontWeight: "500", textAlign: "center" },
  emptyCopy: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 8, maxWidth: 260 },
  pageContent: { padding: 23, paddingBottom: 38 },
  pageTitle: { color: colors.ink, fontSize: 33, letterSpacing: -1.2, marginTop: 7, marginBottom: 24, fontWeight: "500" },
  cartRow: { flexDirection: "row", paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.line },
  cartImage: { width: 92, height: 112, backgroundColor: "#e9e6df" },
  cartDescription: { flex: 1, paddingLeft: 15, alignItems: "flex-start" },
  cartName: { color: colors.ink, fontSize: 14, fontWeight: "500", marginTop: 4 },
  quantityControl: { flexDirection: "row", alignItems: "center", marginTop: 11, borderWidth: 1, borderColor: colors.line },
  quantityButton: { width: 31, height: 28, alignItems: "center", justifyContent: "center" },
  quantityButtonText: { color: colors.ink, fontSize: 17 },
  quantityValue: { color: colors.ink, minWidth: 21, textAlign: "center", fontSize: 11 },
  summary: { paddingTop: 22 },
  summaryLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  summaryLabel: { color: colors.ink, fontSize: 13 },
  summaryValue: { color: colors.ink, fontSize: 14, fontWeight: "600" },
  summaryNote: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 7, marginBottom: 17 },
  primaryButton: {
    minHeight: 51,
    paddingHorizontal: 18,
    backgroundColor: colors.green,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: { color: colors.white, fontSize: 12, fontWeight: "600", letterSpacing: 0.2 },
  buttonArrow: { position: "absolute", right: 17, color: colors.white, fontSize: 17 },
  buttonDisabled: { opacity: 0.55 },
  accountCard: { backgroundColor: colors.white, alignItems: "center", padding: 24, borderWidth: 1, borderColor: colors.line },
  accountMark: { width: 57, height: 57, borderRadius: 30, backgroundColor: colors.paleGreen, alignItems: "center", justifyContent: "center" },
  accountMarkText: { color: colors.green, fontSize: 22, fontWeight: "500" },
  accountTitle: { color: colors.ink, fontSize: 19, textAlign: "center", marginTop: 15, fontWeight: "500" },
  accountCopy: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: "center", marginTop: 7, maxWidth: 260 },
  googleButton: { minHeight: 48, borderWidth: 1, borderColor: colors.line, flexDirection: "row", justifyContent: "center", alignItems: "center", paddingHorizontal: 19, marginTop: 20, width: "100%", gap: 10, backgroundColor: colors.white },
  googleMark: { color: "#4285F4", fontSize: 16, fontWeight: "700" },
  googleButtonText: { color: colors.ink, fontSize: 12, fontWeight: "500" },
  signedInPill: { marginTop: 18, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.paleGreen },
  signedInText: { color: colors.green, fontSize: 10, fontWeight: "600" },
  signOutButton: { minHeight: 43, justifyContent: "center", paddingHorizontal: 18, marginTop: 10 },
  signOutButtonText: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  infoCard: { flexDirection: "row", backgroundColor: "#eeece3", padding: 15, marginTop: 15 },
  infoIcon: { color: colors.orange, fontSize: 21, marginRight: 11 },
  infoTextWrap: { flex: 1 },
  infoTitle: { color: colors.ink, fontSize: 12, fontWeight: "600" },
  infoCopy: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 5 },
  accountFootnote: { color: colors.muted, fontSize: 9, textAlign: "center", lineHeight: 15, marginTop: 20, paddingHorizontal: 12 },
  backButton: { alignSelf: "flex-start", paddingVertical: 5, marginBottom: 17 },
  backButtonText: { color: colors.green, fontSize: 11, fontWeight: "600" },
  form: { gap: 9 },
  inputLabel: { color: colors.muted, fontSize: 8, letterSpacing: 1.2, fontWeight: "700", marginTop: 10 },
  textInput: { height: 48, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, paddingHorizontal: 13, color: colors.ink, fontSize: 12 },
  addressInput: { height: 82, paddingTop: 13 },
  checkoutSummary: { backgroundColor: colors.white, padding: 17, borderWidth: 1, borderColor: colors.line, marginTop: 24 },
  loadingState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 25, gap: 15 },
  loadingText: { color: colors.muted, fontSize: 11 },
  tabBar: {
    height: 61,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.paper,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingBottom: 4,
  },
  tabButton: { alignItems: "center", justifyContent: "center", minWidth: 68 },
  tabIcon: { color: "#9b9c93", fontSize: 21, lineHeight: 23 },
  tabIconActive: { color: colors.green },
  tabLabel: { color: "#8e9087", fontSize: 9, marginTop: 2 },
  tabLabelActive: { color: colors.green, fontWeight: "600" },
  tabDot: { position: "absolute", width: 5, height: 5, right: -2, top: 0, borderRadius: 3, backgroundColor: colors.orange },
  messageError: { backgroundColor: "#f5e8e3", flexDirection: "row", paddingHorizontal: 14, paddingVertical: 10, alignItems: "center" },
  messageNotice: { backgroundColor: colors.paleGreen, flexDirection: "row", paddingHorizontal: 14, paddingVertical: 10, alignItems: "center" },
  messageText: { color: colors.ink, flex: 1, fontSize: 10, lineHeight: 15 },
  messageClose: { color: colors.muted, fontSize: 20, paddingLeft: 12 },
  modal: { flex: 1, backgroundColor: colors.paper },
  detailImageWrap: { height: 360, position: "relative", backgroundColor: "#e9e6df" },
  detailImage: { width: "100%", height: "100%", resizeMode: "cover" },
  modalClose: { position: "absolute", right: 17, top: 17, width: 36, height: 36, backgroundColor: colors.white, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  modalCloseText: { color: colors.ink, fontSize: 23, lineHeight: 25 },
  detailContent: { paddingHorizontal: 23, paddingTop: 21, paddingBottom: 35 },
  detailTitle: { color: colors.ink, fontSize: 28, letterSpacing: -0.8, marginTop: 8, fontWeight: "500" },
  detailPrice: { color: colors.green, fontSize: 17, marginTop: 7, fontWeight: "600" },
  detailDescription: { color: "#66685f", fontSize: 13, lineHeight: 21, marginTop: 15 },
  detailStock: { color: colors.muted, fontSize: 10, marginTop: 19 },
  modalFooter: { padding: 18, paddingBottom: Platform.OS === "ios" ? 30 : 18, borderTopWidth: 1, borderTopColor: colors.line },
});
