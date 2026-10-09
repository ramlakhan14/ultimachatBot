
import {
    Box,
    Button,
    Flex,
    Heading,
    Divider,
    Text,
    VStack,
    Badge,
    HStack,
    Icon,
    List,
    ListItem,
    ListIcon,
    Image,
    useToast,
    Tooltip,
    Link,
    useOutsideClick,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
} from '@chakra-ui/react';
import React, { useEffect } from 'react';
import { CardholderIcon, CardsIcon, CheckCircleIcon, UserIcon, UserPlusIcon } from '@phosphor-icons/react';
import { useState, useRef } from 'react';

import CreditInfoModal from './CreditInfoModal';
import PaymentMethodModal from './PaymentMethodModal';
import CardUpdateSuccessModal from './CardUpdateSuccessModal';
import { useHistory, useLocation } from 'react-router-dom';
import { callApi } from '../../services/callApi';


export const PricingCard = ({
    title,
    // isCurrentSubscription,
    userEmail,
    showPricingBtn = true,
    price,
    botLimit,
    bonusCredits,
    description,
    yearlyFullPrice,
    saveUpto,
    type,
    features,
    icon,
    isPopular = false
}: any) => {
    const purpleColor = "#2977FF";
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState<any>("");
    const tooltipRef = useRef<HTMLDivElement>(null);
    const toast = useToast()
    const history = useHistory()
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isConfirmingUpgrade, setIsConfirmingUpgrade] = useState(false);
    const [showCardUpdatedModal, setShowCardUpdatedModal] = useState(false);
    // Distinguishes the two paths that lead into the success modal, purely to
    // show the right message — both take the same 10s-timer, can't-close-early modal.
    const [cardWasUpdated, setCardWasUpdated] = useState(false);
    // Flips to true once the upgrade API call itself has resolved (success or
    // failure) — the modal closes as soon as this is true, whether that's
    // before or after its 10s display timer.
    const [upgradeApiDone, setUpgradeApiDone] = useState(false);
    const pendingUpgradeRef = useRef<{ plan: string; tier: "MONTHLY" | "YEARLY" } | null>(null);

    // lemon.js is loaded via a `defer` <script> tag, while the CRA bundle scripts
    // are plain blocking scripts that run first — so `window.LemonSqueezy` is not
    // guaranteed to exist yet on mount. Re-registering right before opening the
    // overlay (where existence is already checked) avoids that race.
    const registerLemonSqueezyEventHandler = () => {
        if (!(window as any).LemonSqueezy) return false;
        (window as any).LemonSqueezy.Setup({
            eventHandler: (event: any) => {
                if (event?.event === "PaymentMethodUpdate.Updated" && pendingUpgradeRef.current) {
                    (window as any).LemonSqueezy.Url.Close();
                    setIsConfirmingUpgrade(false);
                    const target = pendingUpgradeRef.current;
                    pendingUpgradeRef.current = null;
                    setCardWasUpdated(true);
                    runUpgradeFlow(target.plan, target.tier);
                }
                if (event?.event === "PaymentMethodUpdate.Closed") {
                    pendingUpgradeRef.current = null;
                    setIsConfirmingUpgrade(false);
                }
            },
        });
        return true;
    };

    useEffect(() => {
        registerLemonSqueezyEventHandler();
    }, []);

    // The upgrade call now runs immediately via runUpgradeFlow (in parallel
    // with the modal being shown), so by the time this fires — either the
    // countdown finished after the call already resolved, or the call
    // resolved and closed the modal early — there's nothing left to do but
    // close it.
    const handleCardUpdateContinue = () => {
        setShowCardUpdatedModal(false);
    };

    const CreditTooltip = () => {
        // 1. Properly handle outside clicks to close the tooltip
        useOutsideClick({
            ref: tooltipRef,
            handler: () => setIsOpen(false),
        });

        return (
            <Box ref={tooltipRef} zIndex={20000} display="inline-block" position="relative">
                {/* The Trigger Text */}
                <Text
                    as="span"
                    fontSize="16px"
                    color="#2977FF"
                    fontWeight="400"
                    textDecoration="underline"

                    cursor="pointer"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(!isOpen);
                    }}
                >
                    after payment
                </Text>

                {/* The Custom Tooltip Content */}
                {isOpen && (
                    <Box
                        position="absolute"
                        top="110%" // Positions it above the text
                        left="50%"
                        transform="translateX(-50%)"
                        bg="white"
                        p={4}
                        borderRadius="xl"
                        boxShadow="2xl"
                        border="1px solid"
                        borderColor="gray.200"
                        zIndex={5000} // High z-index to stay above everything
                        width="280px"
                        // IMPORTANT: Prevent clicks inside from closing the tooltip
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Heading size="xs" mb={2} color="#1A202C">
                            How our credits work
                        </Heading>
                        <Box bg="#F7FAFC" p={2} borderRadius="md">
                            <Text fontSize={"14px"} fontWeight={"400"} color={"#1A202C"} mb={2}>
                                All services within UltimaBot run on a unified credit system where
                                1 credit = $0.01. Your one-time bonus credits can be used across
                                all modules as you see fit.
                            </Text>

                            {/* The Modal Trigger */}
                            <Box onClick={(e) => e.stopPropagation()}>
                                <CreditInfoModal />
                            </Box>
                        </Box>

                        {/* Tooltip Arrow */}
                        <Box
                            position="absolute"
                            top="-6px"
                            left="50%"
                            transform="translateX(-50%) rotate(45deg)"
                            bg="white"
                            w="12px"
                            h="12px"
                            borderTop="1px solid"
                            borderLeft="1px solid"
                            borderColor="gray.200"
                        />
                    </Box>
                )}
            </Box>
        );
    };
    let tier: string = type === "yearly" ? "YEARLY" : "MONTHLY";
    let discountData = { discountPercentage: "", couponCode: "" }; // No discount data passed in props
    const { state }: any = useLocation();

    const planRanks: Record<string, number> = {
        STARTER: 1,
        PRO: 2,
        AGENCY: 3,
        ULTIMATE: 4,
    };

    const getPlanScore = (planName?: string, cycle?: string): number => {
        if (!planName) return 0;
        const rank = planRanks[planName.toString().trim().toUpperCase()] || 0;
        if (rank === 0) return 0;
        const isYearlyCycle = cycle?.toString().trim().toUpperCase() === "YEARLY";
        return rank + (isYearlyCycle ? 0.5 : 0.0);
    };

    const currentPlanName = state?.data?.activeSubscription;
    const currentBillingCycle = state?.data?.BillingCycle;

    const isCurrentSubscription =
        Boolean(currentPlanName && currentBillingCycle) &&
        currentPlanName?.toString().trim().toLowerCase() === title?.toString().trim().toLowerCase() &&
        currentBillingCycle?.toString().trim().toUpperCase() === tier.toUpperCase();

    const currentScore = getPlanScore(currentPlanName, currentBillingCycle);
    const cardScore = getPlanScore(title, tier);

    const getButtonText = () => {
        if (isCurrentSubscription) {
            return 'Current Plan';
        }
        if (state?.data?.type === "upgrade") {
            if (cardScore < currentScore) {
                return 'Downgrade';
            }
            return 'Upgrade';
        }
        if (state?.data?.type === "newplan") {
            return 'Purchase';
        }
        return 'Subscribe';
    };

    const variantMap: Record<string, Record<"MONTHLY" | "YEARLY", string>> = {
        STARTER: {
            MONTHLY: "1241348",
            YEARLY: "1241352",
        },
        PRO: {
            MONTHLY: "1241349",
            YEARLY: "1241353",
        },
        AGENCY: {
            MONTHLY: "1241350",
            YEARLY: "1241354",
        },
        ULTIMATE: {
            MONTHLY: "1241351",
            YEARLY: "1241355",
        },
    };

    const upgradePlan = async (
        plan: string,
        tier: "MONTHLY" | "YEARLY"
    ) => {
        const variantId = variantMap[plan]?.[tier];

        if (!variantId) {
            toast({
                title: "Invalid plan selection",
                status: "error",
            });
            return;
        }
        setIsLoading(plan)
        // console.log("va", plan);

        try {
            await callApi(
                "lemon/change-subscription",
                "PATCH",
                { newVariantId: variantId }
            );
            setIsLoading("")
            history.push('/app/myprofile')
            toast({
                title: "Plan upgraded successfully",
                status: "success",
            });
        } catch (err: any) {
            setIsLoading("")
            toast({
                title: err?.response?.data?.message || err?.message || "Upgrade failed",
                status: "error",
            });
        }
    };

    // Kicks the actual upgrade call off immediately (in parallel with the
    // success modal being shown), rather than waiting for the modal's timer
    // to finish first. `upgradeApiDone` flips once this settles, which is
    // what tells the modal it's safe to close — whether that's before or
    // after its 10s display timer.
    const runUpgradeFlow = async (plan: string, tier: "MONTHLY" | "YEARLY") => {
        setUpgradeApiDone(false);
        setShowCardUpdatedModal(true);
        try {
            await upgradePlan(plan, tier);
        } finally {
            setUpgradeApiDone(true);
        }
    };


    const [upgradeTarget, setUpgradeTarget] = useState<{ plan: string; tier: "MONTHLY" | "YEARLY" } | null>(null);

    const openUpgradeConfirm = (plan: string, upgradeTier: "MONTHLY" | "YEARLY") => {
        setUpgradeTarget({ plan, tier: upgradeTier });
        setIsPaymentModalOpen(true);
    };

    const handlePaymentMethodConfirm = (useNewCard: boolean, updatePaymentMethodUrl: string | null) => {
        if (!upgradeTarget) return;
        setIsPaymentModalOpen(false);

        if (!useNewCard) {
            // Same card as already on file — still route through the success
            // modal (10s display, closes as soon as the upgrade call itself
            // resolves), same as the new-card path below.
            setCardWasUpdated(false);
            runUpgradeFlow(upgradeTarget.plan, upgradeTarget.tier);
            return;
        }

        if (!updatePaymentMethodUrl || !registerLemonSqueezyEventHandler()) {
            toast({
                title: "Unable to open the card update form. Please try again.",
                status: "error",
            });
            return;
        }

        pendingUpgradeRef.current = upgradeTarget;
        setIsConfirmingUpgrade(true);
        (window as any).LemonSqueezy.Url.Open(updatePaymentMethodUrl);
    };

    console.log("process.env.", process.env.REACT_APP_STARTER_M);


    const getPaymentLink = React.useCallback(() => {
        const discountQuery = discountData?.couponCode ? `&checkout[discount_code]=${discountData.couponCode}` : '';

        const subscriptionLinks: Record<string, Record<string, string>> = {
            STARTER: {
                YEARLY: `${process.env.REACT_APP_STARTER_YEARLY || "https://ultimabot.lemonsqueezy.com/checkout/buy/68b719db-04d8-4760-bddc-d0f9d5150a11?enabled=1241352"}&embed=1&checkout[email]=${userEmail}${discountQuery}`,
                MONTHLY: `${process.env.REACT_APP_STARTER_MONTHLY || "https://ultimabot.lemonsqueezy.com/checkout/buy/d92cabc2-344f-4499-9162-42d2066bf9f0?enabled=1241348"}&embed=1&checkout[email]=${userEmail}`,
            },
            PRO: {
                YEARLY: `${process.env.REACT_APP_PRO_YEARLY || "https://ultimabot.lemonsqueezy.com/checkout/buy/9a739337-20f9-44a8-86eb-f33bd0e30680?enabled=1241353"}&embed=1&checkout[email]=${userEmail}${discountQuery}`,
                MONTHLY: `${process.env.REACT_APP_PRO_MONTHLY || "https://ultimabot.lemonsqueezy.com/checkout/buy/8ee121d9-7022-4189-aa74-1069236a631c?enabled=1241349"}&embed=1&checkout[email]=${userEmail}`,
            },
            AGENCY: {
                YEARLY: `${process.env.REACT_APP_AGENCY_YEARLY || "https://ultimabot.lemonsqueezy.com/checkout/buy/30cace18-0976-435f-8b7f-b62ecb9ed482?enabled=1241354"}&embed=1&checkout[email]=${userEmail}${discountQuery}`,
                MONTHLY: `${process.env.REACT_APP_AGENCY_MONTHLY || "https://ultimabot.lemonsqueezy.com/checkout/buy/9c2108f1-e703-4e5d-8485-b84c5b58a91f?enabled=1241350"}&embed=1&checkout[email]=${userEmail}`,
            },
            ULTIMATE: {
                YEARLY: `${process.env.REACT_APP_ULTIMATE_YEARLY || "https://ultimabot.lemonsqueezy.com/checkout/buy/5951938e-c260-43a6-a105-b91a8f7a5a89?enabled=1241355"}&embed=1&checkout[email]=${userEmail}${discountQuery}`,
                MONTHLY: `${process.env.REACT_APP_ULTIMATE_MONTHLY || "https://ultimabot.lemonsqueezy.com/checkout/buy/9657ef1c-1056-4140-8c8f-626263b0ce46?enabled=1241351"}&embed=1&checkout[email]=${userEmail}`,
            },
        };

        return subscriptionLinks[title?.toUpperCase()]?.[tier];
    }, [discountData?.couponCode, type, tier, userEmail]);


    const getPricingBtn = React.useCallback(() => {
        if (!showPricingBtn) return null;
        const buttonText = getButtonText();
        return <Box mt={6}>
            {
                (state?.data?.type == "upgrade") ?
                    <Button
                        position={"absolute"}
                        bottom={"25px"}
                        isLoading={isLoading == title?.toUpperCase()}
                        disabled={isCurrentSubscription}
                        onClick={() => {
                            if (state?.data?.type == "upgrade") {
                                openUpgradeConfirm(title?.toUpperCase(), tier?.toUpperCase() as "YEARLY" | "MONTHLY")
                            }
                        }}
                        left={"14px"}
                        width={"90%"}
                        variant={isPopular ? "solid" : "outline"}
                        colorScheme='blue'
                        borderColor={"#5492FF"}
                        leftIcon={<Image
                            src={`/icons/ic-mastercard${isPopular ? "-w" : ""}.svg`}
                            alt="Mastercard"
                            boxSize="20px"
                        />}
                        borderRadius="4px"
                        p="10px 24px"
                    >

                        {buttonText}
                    </Button> :
                    <Button
                        position="absolute"
                        bottom="25px"
                        fontWeight={500}
                        left="14px"
                        width="90%"
                        isLoading={isLoading == title?.toUpperCase()}
                        variant={isPopular ? "solid" : "outline"}
                        borderColor="#5492FF"
                        colorScheme="blue"
                        leftIcon={
                            <Image
                                src={`/icons/ic-mastercard${isPopular ? "-w" : ""}.svg`}
                                alt="Mastercard"
                                boxSize="20px"
                            />
                        }
                        borderRadius="4px"
                        p="10px 24px"
                        onClick={() => {
                            const url = getPaymentLink();

                            if (state?.data?.type === "upgrade") {
                                openUpgradeConfirm(title?.toUpperCase(), tier?.toUpperCase() as "YEARLY" | "MONTHLY");
                                return;
                            }

                            if ((window as any).LemonSqueezy) {
                                (window as any).LemonSqueezy.Url.Open(url);
                            }
                        }}
                    >
                        {buttonText}
                    </Button>


            }
        </Box>
    }, [getPaymentLink, isCurrentSubscription, isPopular, showPricingBtn, isLoading, state, title, tier, cardScore, currentScore, upgradePlan]);





    return (
        <Box
            bg="white"
            borderRadius="xl"
            border="2px solid"
            p={"20px"}
            // onMouseEnter={() => setIsOpen(true)}
            // onMouseLeave={() => setIsOpen(false)}
            paddingBottom={"75px"}
            borderColor={isPopular ? purpleColor : "#E2E8F0"}
            position="relative"
            shadow="sm"
            transition="transform 0.2s" height={isPopular ? "calc(100% + 30px)" : "100%"}
            transform={isPopular ? "translateY(-30px)" : "translateY(0)"}
            _hover={{
                transform: isPopular ? "translateY(-34px)" : "translateY(-4px)",
                shadow: "md"
            }}
        >
            {isPopular && (
                <Box
                    position="absolute"
                    top="-1px"
                    left="-1px"
                    right="-1px"
                    bg={purpleColor}
                    color="white"
                    py={1}
                    borderTopRadius="xl"
                    fontSize="sm"
                    height={"36px"}
                    fontWeight="bold"
                    textAlign="center"
                >
                    <HStack justify="center" spacing={"10px"}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12.716 8.00572C12.7054 8.04702 12.6814 8.08362 12.6477 8.10976C12.614 8.1359 12.5726 8.15009 12.53 8.15009C12.4874 8.15009 12.4459 8.1359 12.4123 8.10976C12.3786 8.08362 12.3546 8.04702 12.344 8.00572C11.882 6.37652 10.598 5.09632 8.9724 4.63232C8.93121 4.62192 8.89467 4.59808 8.86856 4.56457C8.84246 4.53106 8.82828 4.4898 8.82828 4.44732C8.82828 4.40484 8.84246 4.36357 8.86856 4.33006C8.89467 4.29655 8.93121 4.27271 8.9724 4.26232C9.77481 4.03288 10.5055 3.60269 11.0954 3.01237C11.6854 2.42204 12.1151 1.69108 12.344 0.888517C12.3546 0.847217 12.3786 0.810611 12.4123 0.78447C12.4459 0.75833 12.4874 0.744141 12.53 0.744141C12.5726 0.744141 12.614 0.75833 12.6477 0.78447C12.6814 0.810611 12.7054 0.847217 12.716 0.888517C13.178 2.51772 14.4624 3.79812 16.0876 4.26192C16.1289 4.27224 16.1655 4.29606 16.1917 4.3296C16.2179 4.36314 16.2321 4.40447 16.2321 4.44702C16.2321 4.48957 16.2179 4.53089 16.1917 4.56443C16.1655 4.59797 16.1289 4.62179 16.0876 4.63212C14.4624 5.09612 13.178 6.37832 12.7162 8.00552L12.716 8.00572ZM19.3904 11.6817C18.7885 11.854 18.2403 12.1768 17.7978 12.6197C17.3552 13.0625 17.0327 13.6109 16.8608 14.2129C16.8198 14.3573 16.623 14.3573 16.5842 14.2129C16.4123 13.6108 16.0899 13.0625 15.6473 12.6196C15.2047 12.1767 14.6566 11.8538 14.0546 11.6815C14.0233 11.6743 13.9953 11.6567 13.9753 11.6316C13.9553 11.6064 13.9444 11.5753 13.9444 11.5431C13.9444 11.511 13.9553 11.4798 13.9753 11.4546C13.9953 11.4295 14.0233 11.4119 14.0546 11.4047C15.2746 11.0599 16.2372 10.0971 16.5842 8.87532C16.5915 8.84409 16.6091 8.81624 16.6342 8.79631C16.6593 8.77637 16.6904 8.76552 16.7225 8.76552C16.7546 8.76552 16.7857 8.77637 16.8108 8.79631C16.8359 8.81624 16.8535 8.84409 16.8608 8.87532C17.2078 10.0971 18.1704 11.0599 19.3904 11.4047C19.5364 11.4457 19.5364 11.6389 19.3904 11.6817ZM11.389 13.9829C8.951 14.6765 7.0256 16.5981 6.3338 19.0399C6.31813 19.1022 6.28211 19.1575 6.23144 19.197C6.18077 19.2366 6.11835 19.258 6.0541 19.258C5.98984 19.258 5.92743 19.2366 5.87676 19.197C5.82609 19.1575 5.79006 19.1022 5.7744 19.0399C5.0826 16.5999 3.161 14.6765 0.719196 13.9829C0.65672 13.9677 0.601153 13.932 0.561416 13.8815C0.521679 13.8309 0.500076 13.7685 0.500076 13.7042C0.500076 13.6399 0.521679 13.5775 0.561416 13.527C0.601153 13.4764 0.65672 13.4407 0.719196 13.4255C3.1572 12.7335 5.0826 10.8121 5.7744 8.37012C5.78976 8.30753 5.82566 8.25191 5.87637 8.21214C5.92708 8.17237 5.98966 8.15076 6.0541 8.15076C6.11854 8.15076 6.18112 8.17237 6.23182 8.21214C6.28253 8.25191 6.31844 8.30753 6.3338 8.37012C7.0258 10.8081 8.9472 12.7337 11.389 13.4255C11.4515 13.4407 11.507 13.4764 11.5468 13.527C11.5865 13.5775 11.6081 13.6399 11.6081 13.7042C11.6081 13.7685 11.5865 13.8309 11.5468 13.8815C11.507 13.932 11.4515 13.9677 11.389 13.9829Z" fill="white" />
                        </svg>
                        <Text fontWeight={"700"} fontSize={"16px"} lineHeight={"24px"}>Most Popular</Text>
                    </HStack>
                </Box>
            )}

            <VStack align="start" spacing={4} mt={isPopular ? 6 : 0}>
                <Box width={"100%"}>
                    <Flex
                        justify="space-between"
                        align="center"
                        mb={2}
                        flexWrap="wrap" // Allows items to drop to next line if space is tight
                        rowGap={2}>
                        <HStack>
                            <Icon as={icon}
                                color={title == "Agency" ? "#FF8D28" : title == "Pro" ? "#0088FF" : title == "Ultimate" ? "#524D4D" : purpleColor}
                                boxSize={5} />
                            <Heading fontSize={"22px"} fontWeight={"700"} color="#524D4D">{title}</Heading>
                        </HStack>
                        <Badge
                            variant="outline"
                            color="#1D54B5"
                            background={"#EAF1FF"}
                            borderRadius="full"
                            border={"1px solid #2977FF"}
                            p="1px 8px"
                            fontSize={"16px"}
                            fontWeight={"600"}
                            textTransform="none"
                        >
                            {botLimit}
                        </Badge>
                    </Flex>
                </Box>
                <Text fontSize="16px"
                    onMouseEnter={() => setIsOpen(true)}
                    onMouseLeave={() => setIsOpen(false)}
                    color="#2977FF" textDecoration="underline"
                    fontWeight="600">
                    • One-time {bonusCredits} <Text as={"span"} fontWeight={"400!important"}>
                        bonus credits{" "}
                        <CreditTooltip />{" "}
                    </Text>
                </Text>
                <Divider />
                <Text color="#6C757D" fontWeight={"400"} fontSize="16px" minH="40px">
                    {description}
                </Text>

                {
                    type == "yearly" &&
                    <Flex align="center" mb={"0px"} pb={"0px"} gap={3}>
                        {/* Price */}
                        <Text
                            fontSize="32px"
                            fontWeight="400"
                            color="#6C757D"
                            textDecoration="line-through"
                        >
                            ${yearlyFullPrice}
                        </Text>

                        {/* Save badge */}
                        <Box
                            px={3}
                            py={1}
                            borderRadius="full"
                            bg="#E2E8F0"
                            fontSize="14px"
                            fontWeight="500"
                            color="gray.800"
                        >
                            Save ${saveUpto}
                        </Box>
                    </Flex>
                }
                <HStack align="baseline" mt={type == "yearly" ? "15px !important" : "15px!important"} >
                    <Heading fontSize="52px" fontWeight={"600"} color="#524D4D">${price}</Heading>
                    <Text color="#524D4D">/ {type}</Text>
                </HStack>

                <Divider />

                <Text fontWeight="500" fontSize="14px" color={purpleColor} >
                    Create{" "}{!botLimit?.toLowerCase()?.includes("unlimited") && "Any "}
                    <Text as="span" fontWeight="700">
                        {" " + botLimit + " "}
                    </Text>
                    You Want:
                </Text>


                <List spacing={3} w="full">
                    {features.map((feature: any) => (
                        <ListItem key={feature} fontSize="16px" gap={"20px"} color="#524D4D" fontWeight={"400"} display="flex" alignItems="center">
                            <ListIcon fontSize={"24px"} margin={"0"} as={CheckCircleIcon} color={purpleColor} />
                            {feature}
                        </ListItem>
                    ))}
                </List>
                {getPricingBtn()}

            </VStack>

            <PaymentMethodModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                isSubmitting={isConfirmingUpgrade}
                onConfirm={handlePaymentMethodConfirm}
            />
            <CardUpdateSuccessModal
                isOpen={showCardUpdatedModal}
                seconds={10}
                ready={upgradeApiDone}
                onContinue={handleCardUpdateContinue}
                message={
                    cardWasUpdated
                        ? "Your payment method has been updated successfully."
                        : "Continuing with your existing payment method."
                }
            />


        </Box>
    );
};
