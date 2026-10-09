import {
    Box,
    Button,
    Flex,
    Heading,
    Link, List,
    ListIcon,
    ListItem,
    useDisclosure,
    Text
} from '@chakra-ui/react';
import React, { useState } from 'react';
import { DiscoutData, SubscriptionData, SubscriptionDataLTD, SubscriptionTier, SubscriptionType, SubscriptionTypeLTD } from '../../types/subscription.type';
import { CheckCircleBlueIconMd } from '../Icons/CheckCircleBlueIconMd';
import { MdEuroSymbol } from "react-icons/md";
import { RiMastercardFill } from "react-icons/ri";
import ApiKeyModal from "./ApiKeyModal";


type PricingCardProps = {
    tier: SubscriptionTier;
    discountData?: DiscoutData;
    subscriptionData: SubscriptionData | SubscriptionDataLTD;
    isCurrentSubscription: boolean;
    userEmail: string;
    isPopular?: boolean;
    showPricingBtn?: boolean;
}

const BASE_MONTHLY_PRICING = 29;
const BASE_YEARLY_PRICING = 16;
const STANDARD_MONTHLY_PRICING = 30;
const STANDARD_YEARLY_PRICING = 41;
const PREMIUM_MONTHLY_PRICING = 100;
const PREMIUM_YEARLY_PRICING = 82;
const ENTERPRICE_MONTHLY_PRICING = 200;
const ENTERPRICE_YEARLY_PRICING = 291;

const LIFETIME_PLAN1_PRICING = 59;
const LIFETIME_PLAN2_PRICING = 118;
const LIFETIME_PLAN3_PRICING = 177;

export const PricingApiCard = ({
    tier,
    discountData,
    subscriptionData,
    isCurrentSubscription,
    userEmail,
    isPopular,
    showPricingBtn = true
}: PricingCardProps) => {

    const [paymentUrl, setPaymentUrl] = useState('');

    const { isOpen, onOpen, onClose } = useDisclosure();

    const handleOpen = (url: string) => {
        onOpen();
        setPaymentUrl(url);
    }

    const getPricingMarkup = React.useCallback((type: SubscriptionType | SubscriptionTypeLTD) => {

        let ltdPrice = 0;
        switch (type) {
            case 'AppSumo tier 1':
                ltdPrice = LIFETIME_PLAN1_PRICING;
                break;
            case 'AppSumo tier 2':
                ltdPrice = LIFETIME_PLAN2_PRICING;
                break;
            case 'AppSumo tier 3':
                ltdPrice = LIFETIME_PLAN3_PRICING;
                break;
        }
        if (type === 'AppSumo tier 1' || type === 'AppSumo tier 2' || type === 'AppSumo tier 3') {
            return <Flex align="baseline">
                <Text fontSize="5xl" fontWeight="600">
                    {ltdPrice}
                </Text>
                <Text ml={2}>/lifetime</Text>
            </Flex>
        }

        let basePrice = 0;
        if (tier === 'YEARLY') {
            switch (type) {
                case 'Starter':
                    basePrice = BASE_YEARLY_PRICING;
                    break;
                case 'Pro':
                    basePrice = STANDARD_YEARLY_PRICING;
                    break;
                case 'Agency':
                    basePrice = PREMIUM_YEARLY_PRICING;
                    break;
                case 'Ultimate':
                    basePrice = ENTERPRICE_YEARLY_PRICING;
                    break;
            }
        } else {
            switch (type) {
                case 'Starter':
                    basePrice = BASE_MONTHLY_PRICING;
                    break;
                case 'Pro':
                    basePrice = STANDARD_MONTHLY_PRICING;
                    break;
                case 'Agency':
                    basePrice = PREMIUM_MONTHLY_PRICING;
                    break;
                case 'Ultimate':
                    basePrice = ENTERPRICE_MONTHLY_PRICING;
                    break;
            }
        }

        let price = (tier === 'YEARLY') ?
            getDiscountedPrice(basePrice, discountData?.discountPercentage || 0) :
            getDiscountedPrice(basePrice, 0);
        let priceRounded = Math.ceil(price);
        return <Flex align="baseline">
            <Text fontSize="60px" fontWeight="600">

                <MdEuroSymbol style={{ display: "inline", fontSize: "50px" }} />{priceRounded}
            </Text>
            <Text ml={2} fontSize="14px" fontWeight="400">/month</Text>
        </Flex>
    }, [discountData, tier]);

    const getPaymentLink = React.useCallback(() => {
        const discountQuery = discountData?.couponCode ? `&checkout[discount_code]=${discountData.couponCode}` : '';

        const subscriptionLinks: Record<string, Record<string, string>> = {
            STARTER: {
                YEARLY: `https://ultimabot.lemonsqueezy.com/checkout/buy/44847d93-bdc7-469c-969c-abc308b13db7?enabled=1241306&embed=1&checkout[email]=${userEmail}${discountQuery}`,
                MONTHLY: `https://ultimabot.lemonsqueezy.com/checkout/buy/8cec4bcb-f411-4e00-9a23-490554c2496c?enabled=1238584&embed=1&checkout[email]=${userEmail}`,
            },
            PRO: {
                YEARLY: `https://ultimabot.lemonsqueezy.com/checkout/buy/1e1d44aa-e682-4be0-b1ba-8dd9ff1c0f03?enabled=1241308&embed=1&checkout[email]=${userEmail}${discountQuery}`,
                MONTHLY: `https://ultimabot.lemonsqueezy.com/checkout/buy/4e36b54f-b6ec-4963-8ee0-8fc2a95b8bf6?enabled=1238585&embed=1&checkout[email]=${userEmail}`,
            },
            AGENCY: {
                YEARLY: `https://ultimabot.lemonsqueezy.com/checkout/buy/83ce566a-7927-483c-b1bd-1bb8f3abc4b2?enabled=1241313&embed=1&checkout[email]=${userEmail}${discountQuery}`,
                MONTHLY: `https://ultimabot.lemonsqueezy.com/checkout/buy/dbfddbb3-a97e-4962-9f01-91ddd814fd1e?enabled=1238586&embed=1&checkout[email]=${userEmail}`,
            },
            ULTIMATE: {
                YEARLY: `https://ultimabot.lemonsqueezy.com/checkout/buy/2f29bfdd-90c8-463b-af7d-6c6e9ecfc942?enabled=1241314&embed=1&checkout[email]=${userEmail}${discountQuery}`,
                MONTHLY: `https://ultimabot.lemonsqueezy.com/checkout/buy/f3504091-9141-44ac-9d55-7c2563c24e8d?enabled=1238587&embed=1&checkout[email]=${userEmail}`,
            },
        };

        return subscriptionLinks[subscriptionData.type][tier];

    }, [discountData?.couponCode, subscriptionData.type, tier, userEmail]);

    const getPricingBtn = React.useCallback(() => {
        if (!showPricingBtn) return null;
        return <Box mt={6}>
            {/* <Link
                href={(getPaymentLink())}
                isExternal
            > */}
            <Button
                variant="solid"
                colorScheme={isPopular ? "white" : "#A873F5"}
                background={isPopular ? "#fff" : "#fff"}
                color={isPopular ? "#2977FF" : "#2977FF"}
                w="100%"
                border="1px solid #2977FF"
                borderRadius="12px"
                onClick={() => handleOpen(getPaymentLink())}
            >
                <RiMastercardFill color='#2977FF' style={{ marginRight: "10px" }} />{isCurrentSubscription ? 'Current Plan' : 'Subscribe'}
            </Button>
            {/* </Link> */}
        </Box>
    }, [getPaymentLink, isCurrentSubscription, isPopular, showPricingBtn])

    const getDiscountedPrice = (basePrice: number, discount: number = 0) => {
        return basePrice - (basePrice * discount) / 100;
    };

    return (<>
        <Box
            flex={1}
            h="100%"
            borderRadius='12px'
            borderColor="#E2E8F0"
            py={10}
            bg={isPopular ? "white" : "white"}
            borderWidth={!isPopular ? "1px" : "1px"}
            color={isPopular ? "#524D4D" : "#524D4D"}
            px={7}
        >
            <Text fontSize="20px" mb={5} fontWeight="700">
                {subscriptionData.type}
            </Text>
            <Flex mb={4}>
                {getPricingMarkup(subscriptionData.type)}
            </Flex>
            <List spacing={3} fontSize="14px">
                <ListItem>
                    <ListIcon boxSize={22} as={CheckCircleBlueIconMd} color="#A873F5" />
                    {subscriptionData.pageCount} pages
                </ListItem>
                <ListItem whiteSpace="nowrap">
                    <ListIcon boxSize={22} as={CheckCircleBlueIconMd} color="#A873F5" />
                    {subscriptionData.tokenSize} tokens / mo
                </ListItem>
                <ListItem>
                    <ListIcon boxSize={22} as={CheckCircleBlueIconMd} color="#A873F5" />
                    {subscriptionData.projectCount} projects
                </ListItem>
            </List>
            {getPricingBtn()}
        </Box>
        <ApiKeyModal isOpen={isOpen} onClose={onClose} paymentUrl={paymentUrl} />
    </>)
}