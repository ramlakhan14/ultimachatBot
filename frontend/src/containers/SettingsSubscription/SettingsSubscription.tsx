import React from 'react';
import { Box } from '@chakra-ui/react';
// import { FreeComponent } from '../../components/Pricing/FreeComponent';
import { CurrentUser, User } from '../../services/appConfig';
import { DiscoutData } from '../../types/subscription.type';
import { PricingDiscounts, getPricingDiscounts } from '../../services/commonServices';
import { useSelector } from 'react-redux';
import { FreeApiKey } from '../../components/Pricing/FreeApiKey';
import { FreeComponent } from '../../components/Pricing/FreeComponent';


export const SettingsSubscription = () => {
    const userProfile = useSelector((state: any) => state.user?.profile) || {}
    const [discountData, setDiscountData] = React.useState<DiscoutData>();

    React.useEffect(() => {
        async function fetchData() {
            try {
                const url = window.location.href;
                const response = await getPricingDiscounts(url);
                let data = response.data
                if (!data.discountPercentage) {
                    data = {
                        message: 'no discount avaialble',
                        discountPercentage: '0',
                    } as PricingDiscounts;
                }
                const discountPercentage = parseFloat(data.discountPercentage);
                setDiscountData({
                    couponCode: data.couponCode,
                    discountPercentage,
                    countryFlag: data.countryFlag,
                    country: data.country
                });
            } catch (error) {

            } finally {
            }
        }
        fetchData();
    }, []);


    return (
        <Box>
            {
                userProfile?.role == "admin" &&
                <Box pb="6">
                    <FreeComponent
                        activeSubscriptionId={userProfile.activeSubscription}
                        currentSubscription={userProfile.subscriptionData}
                        discountData={discountData}
                        userEmail={userProfile?.email || ""}
                        openAiKey={userProfile?.openaiKeys}
                    />
                </Box>
            }
            <Box pb="6">
                <FreeApiKey
                    activeSubscriptionId={userProfile.activeSubscription}
                    currentSubscription={userProfile.subscriptionData}
                    discountData={discountData}
                    userEmail={userProfile.email}
                    openAiKey={userProfile.openaiKeys}
                />
            </Box>
        </Box>
    );
}
