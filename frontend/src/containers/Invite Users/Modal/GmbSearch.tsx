import React, { useEffect, useState } from "react";
import Multiselect from "multiselect-react-dropdown";
import {
  Box,
  Button,
  Flex,
  Text,
  Select,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  Tabs,
  TabList,
  TabPanels,
  TabPanel,
  Tab,
  Checkbox,
  InputGroup,
  Input,
  FormControl,
  FormLabel,
  Switch,
  Textarea,
  useToast,
  CloseButton,
  HStack,
  VStack,
  Td,
  InputLeftElement,
  TableContainer,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Tooltip
} from "@chakra-ui/react";
import styles from "../InviteUsers.module.scss";
import { useForm } from 'react-hook-form';
import categoriesData from "./categories.json";
import {
  setInviteUser,
  getPostalCode,
  getScrapeResult,
  scrapeFacebook,
  scrapeLinkedin,
  scrapeYellowPages,
  saveScrappedData,
} from "../../../services/inviteUserServices";
import { Country, ICity } from "country-state-city";
import CustomProgressBar from "../../GlobalDashboard/CustomProgress";
import { IoIosSearch } from "react-icons/io";


interface FilterOption {
  id: string;
  label: string;
  key: string;
  operator: string;
  value: any;
  labelKey: string;
  exclusiveGroup?: string;
}

const filterOptions: FilterOption[] = [
  {
    id: "onlyWithWebsite",
    label: "Only with website",
    key: "site",
    operator: "is not blank",
    value: null,
    labelKey: "title.onlyWithWebsite",
    exclusiveGroup: "site_existence",
  },
  {
    id: "withPhone",
    label: "With Phone",
    key: "phone",
    operator: "is blank",
    value: null,
    labelKey: "title.withPhone",
  },
  {
    id: "verified",
    label: "Verified",
    key: "verified",
    operator: "is true",
    value: null,
    labelKey: "title.verified",
  },
];


export const GmbSearch = ({ isOpen, onClose, inviteUserData }: { isOpen: boolean; onClose: () => void, inviteUserData: any }) => {
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  const [sourceChecks, setSourceChecks] = useState({
    gmb: true,
    facebook: false,
    linkedin: false,
    yellowpages: false,
  });

  const handleSourceCheck = (source: 'gmb' | 'facebook' | 'linkedin' | 'yellowpages', checked: boolean) => {
    setSourceChecks((prev) => ({
      ...prev,
      [source]: checked,
    }));
  };

  // Facebook Lead state & errors
  const [selectedFbCatOptions, setSelectedFbCatOptions] = useState<any[]>([]);
  const [fbLocation, setFbLocation] = useState("");
  const [fbLimit, setFbLimit] = useState<number | string>("");
  const [fbQueryError, setFbQueryError] = useState("");
  const [fbLocationError, setFbLocationError] = useState("");
  const [fbLimitError, setFbLimitError] = useState("");

  // LinkedIn Lead state & errors
  const [selectedLiCatOptions, setSelectedLiCatOptions] = useState<any[]>([]);
  const [liCountry, setLiCountry] = useState("");
  const [liLimit, setLiLimit] = useState<number | string>("");
  const [liQueryError, setLiQueryError] = useState("");
  const [liCountryError, setLiCountryError] = useState("");
  const [liLimitError, setLiLimitError] = useState("");

  // Yellow Leads state & errors
  const [selectedYpCatOptions, setSelectedYpCatOptions] = useState<any[]>([]);
  const [selectedYpCountry, setSelectedYpCountry] = useState("");
  const [selectedYpCity, setSelectedYpCity] = useState("");
  const [ypCities, setYpCities] = useState<ICity[]>([]);
  const [ypLimit, setYpLimit] = useState<number | string>("");
  const [ypQueryError, setYpQueryError] = useState("");
  const [ypCountryError, setYpCountryError] = useState("");
  const [ypLimitError, setYpLimitError] = useState("");
  const [ypQuickFilters, setYpQuickFilters] = useState<any[]>([]);
  const [showYpPhone, setShowYpPhone] = useState<boolean>(false);

  const [selectedCatOptions, setSelectedCatOptions] = useState<any>([]);
  const [selectedCountryOption, setSelectedCountryOption] = useState<any>(null);
  const [showQuery, setShowQuery] = useState<boolean>(false);
  const [showBusiness, setShowBusiness] = useState<boolean>(false);
  const [showVerified, setShowVerified] = useState<boolean>(false);
  const [showPhone, setShowPhone] = useState<boolean>(false);
  const [showRating, setShowRating] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Separate search queries for each tab's table filter
  const [gmbSearchQuery, setGmbSearchQuery] = useState<string>("");
  const [fbSearchQuery, setFbSearchQuery] = useState<string>("");
  const [liSearchQuery, setLiSearchQuery] = useState<string>("");
  const [ypSearchQuery, setYpSearchQuery] = useState<string>("");

  const toast = useToast();

  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [cities, setCities] = React.useState<ICity[]>([]);
  const [quickFilters, setQuickFilters] = useState<any[]>([]);

  const countries = Country.getAllCountries();

  const getCitiesOfCountry = async (countryCode: string) => {
    try {
      const cities = await getPostalCode(countryCode);
      return cities?.data;
    } catch (error) {
      return [];
    }
  };

  const {
    register,
    setError,
    clearErrors,
    reset,
    getValues,
    formState: { errors },
  } = useForm();

  const resetAllFormFields = () => {
    setGmbData([]);
    setFacebookData([]);
    setLinkedinData([]);
    setYellowpagesData([]);
    setGmbSearchQuery("");
    setFbSearchQuery("");
    setLiSearchQuery("");
    setYpSearchQuery("");

    setSelectedCatOptions([]);
    setSelectedCountryOption(null);
    setSelectedCountry("");
    setSelectedCity("");
    setCities([]);
    setQuickFilters([]);
    setShowQuery(false);
    setShowBusiness(false);
    setShowVerified(false);
    setShowPhone(false);
    setShowRating(false);

    setSelectedFbCatOptions([]);
    setFbLocation("");
    setFbLimit("");
    setFbQueryError("");
    setFbLocationError("");
    setFbLimitError("");

    setSelectedLiCatOptions([]);
    setLiCountry("");
    setLiLimit("");
    setLiQueryError("");
    setLiCountryError("");
    setLiLimitError("");

    setSelectedYpCatOptions([]);
    setSelectedYpCountry("");
    setSelectedYpCity("");
    setYpCities([]);
    setYpLimit("");
    setYpQueryError("");
    setYpCountryError("");
    setYpLimitError("");
    setYpQuickFilters([]);
    setShowYpPhone(false);

    setActiveTabIndex(0);
    setSourceChecks({
      gmb: true,
      facebook: false,
      linkedin: false,
      yellowpages: false,
    });

    reset();
  };

  useEffect(() => {
    if (!isOpen) {
      resetAllFormFields();
    }
  }, [isOpen]);

  const handleQuickFilters = (filterId: string) => {
    setQuickFilters((prev) => {
      const exists = prev.find((f) => f.id === filterId);
      if (exists) {
        return prev.filter((f) => f.id !== filterId);
      } else {
        const filterToAdd = filterOptions.find((f) => f.id === filterId);
        return filterToAdd ? [...prev, filterToAdd] : prev;
      }
    });
  };

  const handleRemoveFilter = (filterId: string) => {
    setQuickFilters((prev) => prev.filter((f) => f.id !== filterId));
  };

  const onSelectCatOptions = (selectedCatList: any) => {
    setSelectedCatOptions(selectedCatList);
    if (selectedCatList.length > 0) {
      clearErrors('categories');
    }
    if (selectedCatList.length >= 5) {
      toast({
        title: `You can select a maximum of 5 categories.`,
        status: "error",
        isClosable: true,
      });
      return;
    }
  };

  const onRemoveCatOptions = (selectedCatList: any) => {
    setSelectedCatOptions(selectedCatList);
    if (selectedCatList.length === 0 && !showQuery) {
      setError('categories', { type: 'manual', message: 'Categories are required' });
    }
  };

  const handleQueryToggle = (e: boolean) => {
    setShowQuery(e);
    if (e) {
      clearErrors('categories');
      clearErrors('country');
    }
  };

  const businessToggle = (e: boolean) => {
    setShowBusiness(e);
  };
  const verifiedToggle = (e: boolean) => {
    setShowVerified(e);
  };
  const phoneToggle = (e: boolean) => {
    setShowPhone(e);
  };
  const ratingToggle = (e: boolean) => {
    setShowRating(e);
  };

  const handleYpQuickFilters = (filterId: string) => {
    setYpQuickFilters((prev) => {
      const exists = prev.find((f) => f.id === filterId);
      if (exists) {
        return prev.filter((f) => f.id !== filterId);
      } else {
        const filterToAdd = filterOptions.find((f) => f.id === filterId);
        return filterToAdd ? [...prev, filterToAdd] : prev;
      }
    });
  };

  const handleRemoveYpFilter = (filterId: string) => {
    setYpQuickFilters((prev) => prev.filter((f) => f.id !== filterId));
  };

  const ypPhoneToggle = (e: boolean) => {
    setShowYpPhone(e);
  };

  const handleRatingValueChange = (e: any) => {
    const value = e.target.value;
    clearErrors('ratingValue');
    const values = value.split(',').map((val: any) => parseFloat(val.trim()));
    const isValid = values.every((val: any) => val >= 0.1 || isNaN(val));
    if (!isValid && value) {
      setError('ratingValue', { type: 'manual', message: 'All numbers must be greater than or equal to 0.1' });
    }
  };

  // Separate records state for each tab
  const [gmbData, setGmbData] = useState<any[]>([]);
  const [facebookData, setFacebookData] = useState<any[]>([]);
  const [linkedinData, setLinkedinData] = useState<any[]>([]);
  const [yellowpagesData, setYellowpagesData] = useState<any[]>([]);

  const pollJobResult = (jobId: string, type: 'gmb' | 'facebook' | 'linkedin' | 'yellowpages') => {
    const interval = setInterval(async () => {
      try {
        const response: any = await getScrapeResult(jobId, type);

        const resData = response?.data?.data || response?.data || {};
        const status = resData.status;

        if (status === "FAILED") {
          clearInterval(interval);
          setIsSubmitting(false);
          toast({
            title: resData.message || resData.error || `Scrape failed for ${type.toUpperCase()}`,
            status: "error",
            isClosable: true,
          });
        } else if (status === "COMPLETED") {
          clearInterval(interval);
          setIsSubmitting(false);
          const resultObj = resData.result || {};
          const rows =
            resultObj.allRows ||
            resultObj.validRows ||
            resultObj.data ||
            resData.uniqueScrapData ||
            [];

          if (rows && rows.length > 0) {
            if (type === 'gmb') {
              setGmbData(rows);
            } else if (type === 'facebook') {
              setFacebookData(rows);
            } else if (type === 'linkedin') {
              setLinkedinData(rows);
            } else if (type === 'yellowpages') {
              setYellowpagesData(rows);
            }

            toast({
              title: `${type.toUpperCase()} scraping completed (${rows.length} rows found).`,
              status: "success",
              isClosable: true,
            });
          } else {
            toast({
              title: `No data found for ${type.toUpperCase()} query.`,
              status: "error",
              isClosable: true,
            });
          }
        }
      } catch (error: any) {
        // ignore transient errors
      }
    }, 5000);
  };

  const handleFetchRecords = async () => {
    if (isSubmitting) return;

    // 1. Fetch only for active tab
    if (activeTabIndex === 0) {
      // GMB Search Tab
      if (!sourceChecks.gmb) {
        toast({
          title: "GMB Search checkbox is unchecked. Please check it to fetch records.",
          status: "warning",
          isClosable: true,
        });
        return;
      }

      clearErrors();
      let hasError = false;

      const formData = getValues();

      if (!showQuery) {
        if (!selectedCatOptions || selectedCatOptions.length === 0) {
          setError('categories', { type: 'manual', message: 'Categories are required' });
          hasError = true;
        }
        if (!selectedCountry) {
          setError('country', { type: 'manual', message: 'Country is required' });
          hasError = true;
        }
      } else {
        if (!formData?.query || !formData.query.trim()) {
          setError('query', { type: 'manual', message: 'Search query is required' });
          hasError = true;
        }
      }

      if (!formData?.limit) {
        setError('limit', { type: 'manual', message: 'Limit is required' });
        hasError = true;
      }

      if (showRating && formData?.ratingValue) {
        const values = formData?.ratingValue?.split(',')?.map((val: any) => parseFloat(val.trim()));
        const isValid = values?.every((val: any) => val >= 0.1 || isNaN(val));
        if (!isValid) {
          setError('ratingValue', { type: 'manual', message: 'All numbers must be greater than or equal to 0.1' });
          hasError = true;
        }
      }

      if (hasError) return;

      const {
        businessOperator,
        businessValue,
        verifiedOperator,
        verifiedValue,
        phoneOperator,
        phoneValue,
        ratingOperator,
        ratingValue,
        query,
        ...filteredData
      } = formData;

      const gmbPayload: any = { ...filteredData };

      if (!showQuery && selectedCatOptions && selectedCatOptions.length > 0) {
        gmbPayload.categories = selectedCatOptions.map((category: any) => category.name);
      }
      if (selectedCountry) {
        gmbPayload.country = selectedCountry.toLowerCase();
      }
      if (selectedCity) {
        gmbPayload.city = selectedCity.toLowerCase();
      }
      if (showQuery && query) {
        gmbPayload.query = query;
      }

      gmbPayload.filter = [...quickFilters];
      gmbPayload.limit = parseInt(gmbPayload?.limit || "10");

      if (showBusiness && businessOperator && businessValue) {
        gmbPayload.filter.push({
          field: "business status",
          operator: businessOperator,
          value: businessValue,
        });
      }
      if (showVerified && verifiedOperator && verifiedValue) {
        gmbPayload.filter.push({
          field: "verified",
          operator: verifiedOperator,
          value: verifiedValue,
        });
      }
      if (showPhone && phoneOperator && phoneValue) {
        gmbPayload.filter.push({
          field: "phone",
          operator: phoneOperator,
          value: phoneValue,
        });
      }
      if (showRating && ratingOperator && ratingValue) {
        gmbPayload.filter.push({
          field: "rating",
          operator: ratingOperator,
          value: ratingValue,
        });
      }

      try {
        setIsSubmitting(true);
        const response: any = await setInviteUser(gmbPayload);
        const apiMsg = response?.data?.message || response?.data?.data?.message || response?.message;
        if (apiMsg) {
          toast({
            title: apiMsg,
            status: "success",
            isClosable: true,
          });
        }
        const gJobId = response?.data?.data?.jobId || response?.data?.jobId;
        if (gJobId) {
          pollJobResult(gJobId, 'gmb');
        } else {
          setIsSubmitting(false);
          if (!apiMsg) {
            toast({
              title: "Failed to initiate GMB scrape.",
              status: "error",
              isClosable: true,
            });
          }
        }
      } catch (error: any) {
        setIsSubmitting(false);
        toast({
          title: error?.response?.data?.message || error?.message || "Error initiating GMB scrape.",
          status: "error",
          isClosable: true,
        });
      }
    } else if (activeTabIndex === 1) {
      // Facebook Leads Tab
      if (!sourceChecks.facebook) {
        toast({
          title: "Facebook Leads checkbox is unchecked. Please check it to fetch records.",
          status: "warning",
          isClosable: true,
        });
        return;
      }

      setFbQueryError("");
      setFbLocationError("");
      setFbLimitError("");
      let hasError = false;

      if (!selectedFbCatOptions || selectedFbCatOptions.length === 0) {
        setFbQueryError("Categories / Query are required");
        hasError = true;
      }
      if (!fbLocation) {
        setFbLocationError("Location / Country is required");
        hasError = true;
      }
      if (!fbLimit) {
        setFbLimitError("Limit is required");
        hasError = true;
      }

      if (hasError) return;

      const fbPayload = {
        query: selectedFbCatOptions.map((c: any) => c.name),
        locations: [fbLocation],
        resultsLimit: Number(fbLimit) || 20,
      };

      try {
        setIsSubmitting(true);
        const response: any = await scrapeFacebook(fbPayload);
        const apiMsg = response?.message || response?.data?.message || response?.data?.data?.message;
        if (apiMsg) {
          toast({
            title: apiMsg,
            status: "success",
            isClosable: true,
          });
        }
        const fJobId = response?.jobId || response?.data?.jobId || response?.data?.data?.jobId;
        if (fJobId) {
          pollJobResult(fJobId, 'facebook');
        } else {
          setIsSubmitting(false);
          if (!apiMsg) {
            toast({
              title: "Failed to initiate Facebook scrape.",
              status: "error",
              isClosable: true,
            });
          }
        }
      } catch (error: any) {
        setIsSubmitting(false);
        toast({
          title: error?.response?.data?.message || error?.message || "Error initiating Facebook scrape.",
          status: "error",
          isClosable: true,
        });
      }
    } else if (activeTabIndex === 2) {
      // LinkedIn Leads Tab
      if (!sourceChecks.linkedin) {
        toast({
          title: "LinkedIn Leads checkbox is unchecked. Please check it to fetch records.",
          status: "warning",
          isClosable: true,
        });
        return;
      }

      setLiQueryError("");
      setLiCountryError("");
      setLiLimitError("");
      let hasError = false;

      if (!selectedLiCatOptions || selectedLiCatOptions.length === 0) {
        setLiQueryError("Categories / Query are required");
        hasError = true;
      }
      if (!liCountry) {
        setLiCountryError("Country is required");
        hasError = true;
      }
      if (!liLimit) {
        setLiLimitError("Limit is required");
        hasError = true;
      }

      if (hasError) return;

      const liPayload = {
        query: selectedLiCatOptions.map((c: any) => c.name).join(", "),
        resultsLimit: Number(liLimit) || 20,
        country: liCountry,
      };

      try {
        setIsSubmitting(true);
        const response: any = await scrapeLinkedin(liPayload);
        const apiMsg = response?.message || response?.data?.message || response?.data?.data?.message;
        if (apiMsg) {
          toast({
            title: apiMsg,
            status: "success",
            isClosable: true,
          });
        }
        const lJobId = response?.jobId || response?.data?.jobId || response?.data?.data?.jobId;
        if (lJobId) {
          pollJobResult(lJobId, 'linkedin');
        } else {
          setIsSubmitting(false);
          if (!apiMsg) {
            toast({
              title: "Failed to initiate LinkedIn scrape.",
              status: "error",
              isClosable: true,
            });
          }
        }
      } catch (error: any) {
        setIsSubmitting(false);
        toast({
          title: error?.response?.data?.message || error?.message || "Error initiating LinkedIn scrape.",
          status: "error",
          isClosable: true,
        });
      }
    } else if (activeTabIndex === 3) {
      // Yellow Leads Tab
      if (!sourceChecks.yellowpages) {
        toast({
          title: "Yellow Leads checkbox is unchecked. Please check it to fetch records.",
          status: "warning",
          isClosable: true,
        });
        return;
      }

      setYpQueryError("");
      setYpCountryError("");
      setYpLimitError("");
      let hasError = false;

      const formData = getValues();
      const { ypPhoneOperator, ypPhoneValue } = formData;

      if (!selectedYpCatOptions || selectedYpCatOptions.length === 0) {
        setYpQueryError("Categories are required");
        hasError = true;
      }
      if (!selectedYpCountry) {
        setYpCountryError("Country is required");
        hasError = true;
      }
      if (!ypLimit) {
        setYpLimitError("Limit is required");
        hasError = true;
      }

      if (hasError) return;

      const countryObj = countries.find((c) => c.isoCode === selectedYpCountry);
      const countryName = countryObj ? countryObj.name : selectedYpCountry;
      const locationStr = selectedYpCity ? `${selectedYpCity}, ${countryName}` : countryName;

      const ypFilterList = [...ypQuickFilters];
      if (showYpPhone && ypPhoneOperator && ypPhoneValue) {
        ypFilterList.push({
          field: "phone",
          operator: ypPhoneOperator,
          value: ypPhoneValue,
        });
      }

      const ypPayload: any = {
        query: selectedYpCatOptions.map((c: any) => c.name).join(", "),
        location: locationStr,
        limit: Number(ypLimit) || 20,
        filter: ypFilterList,
      };

      try {
        setIsSubmitting(true);
        const response: any = await scrapeYellowPages(ypPayload);
        const apiMsg = response?.message || response?.data?.message || response?.data?.data?.message;
        if (apiMsg) {
          toast({
            title: apiMsg,
            status: "success",
            isClosable: true,
          });
        }
        const yJobId = response?.jobId || response?.data?.jobId || response?.data?.data?.jobId;
        if (yJobId) {
          pollJobResult(yJobId, 'yellowpages');
        } else {
          setIsSubmitting(false);
          if (!apiMsg) {
            toast({
              title: "Failed to initiate Yellow Pages scrape.",
              status: "error",
              isClosable: true,
            });
          }
        }
      } catch (error: any) {
        setIsSubmitting(false);
        toast({
          title: error?.response?.data?.message || error?.message || "Error initiating Yellow Pages scrape.",
          status: "error",
          isClosable: true,
        });
      }
    }
  };

  const [saveLoading, setSaveLoading] = useState(false);

  const saveScrapedData = async () => {
    let mergedData: any[] = [];
    if (sourceChecks.gmb && gmbData?.length > 0) {
      mergedData = [...mergedData, ...gmbData];
    }
    if (sourceChecks.facebook && facebookData?.length > 0) {
      mergedData = [...mergedData, ...facebookData];
    }
    if (sourceChecks.linkedin && linkedinData?.length > 0) {
      mergedData = [...mergedData, ...linkedinData];
    }
    if (sourceChecks.yellowpages && yellowpagesData?.length > 0) {
      mergedData = [...mergedData, ...yellowpagesData];
    }

    if (mergedData.length === 0) {
      toast({
        title: "No scraped data available to save for the checked sources.",
        status: "warning",
        isClosable: true,
      });
      return;
    }

    try {
      setSaveLoading(true);
      const response = await saveScrappedData(mergedData);
      setSaveLoading(false);
      toast({
        title: response?.data?.message || "Data saved successfully!",
        status: "success",
        isClosable: true,
      });
      resetAllFormFields();
      inviteUserData(1, 10, "");
      onClose();
    } catch (error: any) {
      setSaveLoading(false);
      toast({
        title: error?.response?.data?.message || error?.message || "Server error while saving scraped data.",
        status: "error",
        isClosable: true,
      });
    }
  };

  // Calculate total checked records available to save
  const totalCheckedRecordsCount =
    (sourceChecks.gmb ? gmbData.length : 0) +
    (sourceChecks.facebook ? facebookData.length : 0) +
    (sourceChecks.linkedin ? linkedinData.length : 0) +
    (sourceChecks.yellowpages ? yellowpagesData.length : 0);

  const isCurrentTabChecked =
    (activeTabIndex === 0 && sourceChecks.gmb) ||
    (activeTabIndex === 1 && sourceChecks.facebook) ||
    (activeTabIndex === 2 && sourceChecks.linkedin) ||
    (activeTabIndex === 3 && sourceChecks.yellowpages);

  const handleModalClose = () => {
    resetAllFormFields();
    onClose();
  };

  return (
    <Modal closeOnOverlayClick={false} isOpen={isOpen} onClose={handleModalClose} size="xl">
      <ModalOverlay />
      <ModalContent maxW="850px">
        <ModalBody p={5}>
          <form onSubmit={(e) => { e.preventDefault(); handleFetchRecords(); }}>
            <Tabs index={activeTabIndex} onChange={(index) => setActiveTabIndex(index)} isFitted variant="enclosed">
              <TabList mb="16px">
                <Tab _focus={{ outline: "none" }} style={{ color: activeTabIndex === 0 ? "#2977FF" : "#495057", fontWeight: 500 }}>
                  <Checkbox
                    isChecked={sourceChecks.gmb}
                    onChange={(e) => handleSourceCheck("gmb", e.target.checked)}
                    mr={2}
                    onClick={(e) => e.stopPropagation()}
                  />
                  GMB Search {gmbData.length > 0 ? `(${gmbData.length})` : ""}
                </Tab>
                <Tab _focus={{ outline: "none" }} style={{ color: activeTabIndex === 1 ? "#2977FF" : "#495057", fontWeight: 500 }}>
                  <Checkbox
                    isChecked={sourceChecks.facebook}
                    onChange={(e) => handleSourceCheck("facebook", e.target.checked)}
                    mr={2}
                    onClick={(e) => e.stopPropagation()}
                  />
                  Facebook Leads {facebookData.length > 0 ? `(${facebookData.length})` : ""}
                </Tab>
                <Tab _focus={{ outline: "none" }} style={{ color: activeTabIndex === 2 ? "#2977FF" : "#495057", fontWeight: 500 }}>
                  <Checkbox
                    isChecked={sourceChecks.linkedin}
                    onChange={(e) => handleSourceCheck("linkedin", e.target.checked)}
                    mr={2}
                    onClick={(e) => e.stopPropagation()}
                  />
                  LinkedIn Leads {linkedinData.length > 0 ? `(${linkedinData.length})` : ""}
                </Tab>
                <Tab _focus={{ outline: "none" }} style={{ color: activeTabIndex === 3 ? "#2977FF" : "#495057", fontWeight: 500 }}>
                  <Checkbox
                    isChecked={sourceChecks.yellowpages}
                    onChange={(e) => handleSourceCheck("yellowpages", e.target.checked)}
                    mr={2}
                    onClick={(e) => e.stopPropagation()}
                  />
                  Yellow Leads {yellowpagesData.length > 0 ? `(${yellowpagesData.length})` : ""}
                </Tab>
              </TabList>

              <TabPanels>
                {/* Tab 1: GMB Search */}
                <TabPanel p={"20px"} border="1px solid #DEE2E6" bg="#fff" borderRadius="md">
                  <Box pointerEvents={sourceChecks.gmb ? "auto" : "none"} opacity={sourceChecks.gmb ? 1 : 0.6}>
                    <Box textAlign="center">
                      <Text as="h4" fontSize="18px" fontWeight="600" color="#1A202C">GMB Search</Text>
                      <Text as="p" fontSize="14px" fontWeight="400" color="#6C757D">Scrape the data from the GMB listings by using any of the keywords below:</Text>
                    </Box>
                    <hr style={{ border: "1px solid #E2E8F0", marginTop: "24px", marginBottom: "24px" }} />
                    <Box>
                      <Box
                        p="5"
                        borderWidth="1px"
                        borderColor="#EEF4FA"
                        borderRadius="lg"
                        boxShadow="sm"
                        bg="white"
                        w="100%"
                        mb="24px"
                      >
                        {/* Quick Filters */}
                        <Text fontWeight="500" mb="16px">
                          Quick Filter:
                        </Text>

                        <Box>
                          <HStack spacing="3" wrap="wrap">
                            {filterOptions.map((filter) => {
                              const isActive = quickFilters.some((f) => f.id === filter.id);
                              return (
                                <Button
                                  key={filter.id}
                                  onClick={() => handleQuickFilters(filter.id)}
                                  bg={isActive ? "#2977FF" : "#F8F9FA"}
                                  color={isActive ? "white" : "#000000"}
                                  _hover={{
                                    bg: isActive ? "#2977FF" : "#E2E8F0",
                                  }}
                                  borderRadius="6px"
                                  fontWeight="500"
                                  py={"6px"}
                                  px={"12px"}
                                  fontSize="16px"
                                  boxShadow={isActive ? "md" : "none"}
                                  transition="all 0.2s ease-in-out"
                                >
                                  {filter.label}
                                </Button>
                              );
                            })}
                          </HStack>
                          {/* Active Filters */}
                          {quickFilters.length > 0 && (
                            <>
                              <Text fontWeight="500" my="3">
                                Active Filters
                              </Text>

                              <VStack align="start" flexDirection={"row"} display={"flex"} alignItems={"center"} spacing={4} w="100%">
                                {quickFilters?.length > 1 && (
                                  <VStack
                                    spacing={0}
                                    align="center"
                                    justify="center"
                                    position="relative"
                                    h="80px"
                                    minW="80px"
                                  >
                                    <Box
                                      position="absolute"
                                      top="0"
                                      left="50%"
                                      transform="translateX(-50%)"
                                      w="1px"
                                      h="35%"
                                      bg="gray.300"
                                    />
                                    <Box
                                      position="absolute"
                                      top="-13.5px"
                                      left="53.2px"
                                      transform="rotate(90deg)"
                                      w="1px"
                                      h="35%"
                                      bg="gray.300"
                                    />
                                    <Text
                                      fontSize="xs"
                                      fontWeight="bold"
                                      color="gray.500"
                                      textAlign="center"
                                      zIndex={1}
                                    >
                                      AND
                                    </Text>
                                    <Box
                                      position="absolute"
                                      bottom="-13.5px"
                                      left="53.2px"
                                      transform="rotate(90deg)"
                                      w="1px"
                                      h="35%"
                                      bg="gray.300"
                                    />
                                    <Box
                                      position="absolute"
                                      bottom="0"
                                      left="50%"
                                      transform="translateX(-50%)"
                                      w="1px"
                                      h="35%"
                                      bg="gray.300"
                                    />
                                  </VStack>
                                )}
                                <Box mt={"0px!important"}>
                                  {quickFilters.map((filter) => (
                                    <HStack key={filter.id} marginTop={"0px!important"} align="center" w="100%">
                                      <HStack spacing={4} mt={3} flex="1">
                                        <Select
                                          size="sm"
                                          value={filter.key}
                                          w="150px"
                                          onChange={(e) => {
                                            const newKey = e.target.value;
                                            setQuickFilters((prev) =>
                                              prev.map((f) =>
                                                f.id === filter.id ? { ...f, key: newKey } : f
                                              )
                                            );
                                          }}
                                        >
                                          <option value="site">Site</option>
                                          <option value="phone">Phone</option>
                                          <option value="verified">Verified</option>
                                        </Select>
                                        <Select
                                          size="sm"
                                          value={filter.operator}
                                          w="150px"
                                          onChange={(e) => {
                                            const newOperator = e.target.value;
                                            setQuickFilters((prev) =>
                                              prev.map((f) =>
                                                f.id === filter.id
                                                  ? { ...f, operator: newOperator }
                                                  : f
                                              )
                                            );
                                          }}
                                        >
                                          <option value="is blank">Is blank</option>
                                          <option value="is not blank">Is not blank</option>
                                          <option value="equals">Equals</option>
                                          <option value="is true">Is true</option>
                                          <option value="is false">Is false</option>
                                        </Select>
                                        <CloseButton
                                          aria-label="Remove Filter"
                                          size="sm"
                                          fontSize={"10px"}
                                          variant="ghost"
                                          color="gray.500"
                                          _hover={{ color: "red.500" }}
                                          onClick={() => handleRemoveFilter(filter.id)}
                                        />
                                      </HStack>
                                    </HStack>
                                  ))}
                                </Box>
                              </VStack>
                            </>
                          )}
                        </Box>
                      </Box>
                      <FormControl mb={"-20px"}>
                        <Flex w="100%" alignItems="center" justifyContent={"flex-end"}>
                          <FormLabel fontSize="14px" mb="0" mr="2" htmlFor="showAsPopup">
                            Plain queries
                          </FormLabel>
                          <Switch
                            isChecked={showQuery}
                            onChange={(event) => { handleQueryToggle(event.target.checked) }}
                            colorScheme="blue"
                            size="sm"
                            outline={"none"}
                            mr="2"
                          />
                        </Flex>
                      </FormControl>
                      <Box alignItems="center">
                        {!showQuery && (
                          <FormControl isRequired mb={"20px"}>
                            <FormLabel marginRight="8px">Categories</FormLabel>
                            <Multiselect
                              style={{ marginTop: "15px" }}
                              options={categoriesData}
                              selectionLimit={5}
                              onSelect={onSelectCatOptions}
                              onRemove={onRemoveCatOptions}
                              displayValue="name"
                              closeIcon="cancel"
                              placeholder="Select Options"
                              selectedValues={selectedCatOptions}
                              className="multiSelectContainer"
                            />
                            {errors.categories && <p style={{ color: '#DC3545', fontSize: '12px', marginTop: '4px' }}>{errors.categories.message as string}</p>}
                          </FormControl>
                        )}
                        {showQuery && (
                          <FormControl isRequired mb={"15px"}>
                            <FormLabel marginRight="8px">
                              Queries (category + city + country)
                            </FormLabel>
                            <InputGroup borderRadius="4px" marginRight="8px">
                              <Textarea
                                id="query"
                                placeholder="Real estate agency, Rome, Italy&#10;Doctor, London, UK&#10;Restaurant, New York, US&#10;(Press Enter to add a new line)"
                                color="#6C757D"
                                rows={5}
                                {...register('query', { required: 'Search query is required' })}
                              />
                            </InputGroup>
                            {errors.query && <p style={{ color: '#DC3545', fontSize: '12px', marginTop: '4px' }}>{errors.query.message as string}</p>}
                          </FormControl>
                        )}
                        <Flex gap={3} w="100%" alignItems="flex-start">
                          <Box flex={1}>
                            <FormControl isRequired>
                              <FormLabel mb={2}>Country</FormLabel>
                              <Select
                                placeholder="Select Country"
                                value={selectedCountry}
                                {...register("country", { required: "Country is required" })}
                                onChange={async (e) => {
                                  const value = e.target.value;
                                  setSelectedCountry(value);
                                  clearErrors("country");
                                  const allcity: any = await getCitiesOfCountry(e.target.value);
                                  setCities(allcity);
                                  setSelectedCity("");
                                }}
                              >
                                {countries.map((country) => (
                                  <option key={country.isoCode} value={country.isoCode}>
                                    {country.name}
                                  </option>
                                ))}
                              </Select>
                              {errors.country && <p style={{ color: '#DC3545', fontSize: '12px', marginTop: '4px' }}>{errors.country.message as string}</p>}
                            </FormControl>
                          </Box>

                          <Box flex={1}>
                            <FormControl>
                              <FormLabel mb={2}>City</FormLabel>
                              <Select
                                placeholder="Select City"
                                value={selectedCity}
                                onChange={(e) => setSelectedCity(e.target.value)}
                                isDisabled={!selectedCountry}
                              >
                                {cities?.length > 0 ? (
                                  cities?.map((city: any, index: any) => (
                                    <option key={index} value={city}>
                                      {city}
                                    </option>
                                  ))
                                ) : (
                                  <option value="">City not available</option>
                                )}
                              </Select>
                            </FormControl>
                          </Box>

                          <Box flex={1}>
                            <FormControl isRequired>
                              <FormLabel mb={2}>Limits</FormLabel>
                              <Select
                                width="100%"
                                color="#000000!important"
                                {...register('limit', { required: 'Limit is required' })}
                              >
                                <option value={''}>Select Limit</option>
                                <option value={10}>10</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={150}>150</option>
                                <option value={200}>200</option>
                                <option value={250}>250</option>
                                <option value={300}>300</option>
                                <option value={350}>350</option>
                                <option value={400}>400</option>
                                <option value={450}>450</option>
                                <option value={500}>500</option>
                              </Select>
                              {errors.limit && <p style={{ color: '#DC3545', fontSize: '12px', marginTop: '4px' }}>{errors.limit.message as string}</p>}
                            </FormControl>
                          </Box>
                        </Flex>
                        <Box mb={"15px"}>
                          <Text fontWeight={500} marginRight="8px" mt={3} mb="10px">
                            Advanced parameters
                          </Text>
                          <Box mb={"15px"}>
                            <FormControl mb={"0px"}>
                              <Flex w="100%" alignItems="center" justifyContent={"space-between"}>
                                <FormLabel fontWeight="500" fontSize="16px" color="#212529" mb="0" mr="2" htmlFor="showAsPopup">
                                  Business Status
                                </FormLabel>
                                <Switch
                                  isChecked={showBusiness}
                                  onChange={(event) => { businessToggle(event.target.checked) }}
                                  colorScheme="blue"
                                  size="lg"
                                  outline={"none"}
                                />
                              </Flex>
                            </FormControl>
                            {showBusiness && (
                              <Box p={"10px"} mb={"15px"}>
                                <Flex w="100%" alignItems="center" gap={2} justifyContent={"space-between"}>
                                  <Box w="50%">
                                    <Text as="span" fontSize={"14px"} marginRight="8px">
                                      Operator
                                    </Text>
                                    <Select
                                      width="auto"
                                      color="#6C757D"
                                      {...register('businessOperator', { required: 'Operator is required' })}
                                    >
                                      <option value={'Equals'}>Equals</option>
                                    </Select>
                                    {errors.businessOperator && <p style={{ color: '#DC3545', fontSize: '12px', marginTop: '4px' }}>{errors.businessOperator.message as string}</p>}
                                  </Box>
                                  <Box w="50%">
                                    <Text as="span" fontSize={"14px"} marginRight="8px">
                                      Values (one of)
                                    </Text>
                                    <Select
                                      width="auto"
                                      color="#6C757D"
                                      {...register('businessValue', { required: 'Value is required' })}
                                    >
                                      <option value={''}>Select Value</option>
                                      <option value={'operational'}>Operational</option>
                                      <option value={'closed_temporarily'}>Closed Temporarily</option>
                                      <option value={'closed_permanently'}>Closed Permanently</option>
                                    </Select>
                                    {errors.businessValue && <p style={{ color: '#DC3545', fontSize: '12px', marginTop: '4px' }}>{errors.businessValue.message as string}</p>}
                                  </Box>
                                </Flex>
                              </Box>
                            )}
                          </Box>
                          <Box mb={"15px"}>
                            <FormControl mb={"0px"}>
                              <Flex w="100%" alignItems="center" justifyContent={"space-between"}>
                                <FormLabel fontWeight="500" fontSize="16px" color="#212529" mb="0" mr="2" htmlFor="showAsPopup">
                                  Verified
                                </FormLabel>
                                <Switch
                                  isChecked={showVerified}
                                  onChange={(event) => { verifiedToggle(event.target.checked) }}
                                  colorScheme="blue"
                                  size="lg"
                                  outline={"none"}
                                />
                              </Flex>
                            </FormControl>
                            {showVerified && (
                              <Box p={"10px"} mb={"15px"}>
                                <Flex w="100%" alignItems="center" gap={2} justifyContent={"space-between"}>
                                  <Box w="50%">
                                    <Text as="span" fontSize="14px" marginRight="8px">
                                      Operator
                                    </Text>
                                    <Select
                                      width="auto"
                                      color="#6C757D"
                                      {...register('verifiedOperator', { required: 'Operator is required' })}
                                    >
                                      <option value={'Equals'}>Equals</option>
                                    </Select>
                                    {errors.verifiedOperator && <p style={{ color: '#DC3545', fontSize: '12px', marginTop: '4px' }}>{errors.verifiedOperator.message as string}</p>}
                                  </Box>
                                  <Box w="50%">
                                    <Text as="span" fontSize="14px" marginRight="8px">
                                      Values (one of)
                                    </Text>
                                    <Select
                                      width="auto"
                                      color="#6C757D"
                                      {...register('verifiedValue', { required: 'Value is required' })}
                                    >
                                      <option value={''}>Select Value</option>
                                      <option value={'true'}>True</option>
                                      <option value={'false'}>False</option>
                                    </Select>
                                    {errors.verifiedValue && <p style={{ color: '#DC3545', fontSize: '12px', marginTop: '4px' }}>{errors.verifiedValue.message as string}</p>}
                                  </Box>
                                </Flex>
                              </Box>
                            )}
                          </Box>
                          <Box mb={"15px"}>
                            <FormControl mb={"0px"}>
                              <Flex w="100%" alignItems="center" justifyContent={"space-between"}>
                                <FormLabel fontWeight="500" fontSize="16px" color="#212529" mb="0" mr="2" htmlFor="showAsPopup">
                                  Phone
                                </FormLabel>
                                <Switch
                                  isChecked={showPhone}
                                  onChange={(event) => { phoneToggle(event.target.checked) }}
                                  colorScheme="blue"
                                  size="lg"
                                  outline={"none"}
                                />
                              </Flex>
                            </FormControl>
                            {showPhone && (
                              <Box p={"10px"} mb={"15px"}>
                                <Flex w="100%" alignItems="center" gap={2} justifyContent={"space-between"}>
                                  <Box w="50%">
                                    <Text as="span" fontSize="14px" marginRight="8px">
                                      Operator
                                    </Text>
                                    <Select
                                      width="auto"
                                      color="#6C757D"
                                      {...register('phoneOperator', { required: 'Operator is required' })}
                                    >
                                      <option value={'Equals'}>Equals</option>
                                    </Select>
                                    {errors.phoneOperator && <p style={{ color: '#DC3545', fontSize: '12px', marginTop: '4px' }}>{errors.phoneOperator.message as string}</p>}
                                  </Box>
                                  <Box w="50%">
                                    <Text as="span" fontSize="14px" marginRight="8px">
                                      Values (one of)
                                    </Text>
                                    <Select
                                      width="auto"
                                      color="#6C757D"
                                      {...register('phoneValue', { required: 'Value is required' })}
                                    >
                                      <option value={''}>Select Value</option>
                                      <option value={'id_not_blank'}>Is not blank</option>
                                      <option value={'is_blank'}>Is blank</option>
                                    </Select>
                                    {errors.phoneValue && <p style={{ color: '#DC3545', fontSize: '12px', marginTop: '4px' }}>{errors.phoneValue.message as string}</p>}
                                  </Box>
                                </Flex>
                              </Box>
                            )}
                          </Box>
                          <Box mb={"15px"}>
                            <FormControl mb={"0px"}>
                              <Flex w="100%" alignItems="center" justifyContent={"space-between"}>
                                <FormLabel fontWeight="500" fontSize="16px" color="#212529" mb="0" mr="2" htmlFor="showAsPopup">
                                  Rating
                                </FormLabel>
                                <Switch
                                  isChecked={showRating}
                                  onChange={(event) => { ratingToggle(event.target.checked) }}
                                  colorScheme="blue"
                                  size="lg"
                                  outline={"none"}
                                />
                              </Flex>
                            </FormControl>
                            {showRating && (
                              <Box p={"10px"} mb={"15px"}>
                                <Flex w="100%" alignItems="center" gap={2} justifyContent={"space-between"}>
                                  <Box w="50%">
                                    <Text as="span" fontSize="14px" marginRight="8px">
                                      Operator
                                    </Text>
                                    <Select
                                      width="auto"
                                      color="#6C757D"
                                      {...register('ratingOperator', { required: 'Operator is required' })}
                                    >
                                      <option value={''}>Select Operator</option>
                                      <option value={'Contains_One_Of'}>Contains One Of</option>
                                      <option value={'Contains_None_Of'}>Contains None Of</option>
                                      <option value={'Starts_With'}>starts with</option>
                                      <option value={'Equals'}>Equals</option>
                                    </Select>
                                    {errors.ratingOperator && <p style={{ color: '#DC3545', fontSize: '12px', marginTop: '4px' }}>{errors.ratingOperator.message as string}</p>}
                                  </Box>
                                  <Box w="50%">
                                    <Text as="span" fontSize="14px" marginRight="8px">
                                      Values
                                    </Text>
                                    <InputGroup borderRadius="4px" borderColor="#6C757D" marginRight="8px">
                                      <Input
                                        type="text"
                                        placeholder="4.1, 3.6, 5.5 etc."
                                        color="#6C757D"
                                        size="md"
                                        {...register('ratingValue', { required: 'Value is required' })}
                                        onChange={handleRatingValueChange}
                                      />
                                    </InputGroup>
                                    {errors.ratingValue && <p style={{ color: '#DC3545', fontSize: '12px', marginTop: '4px' }}>{errors.ratingValue.message as string}</p>}
                                  </Box>
                                </Flex>
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  </Box>

                  {/* GMB Scraped Data Table */}
                  {gmbData?.length > 0 && (
                    <Box mt={5}>
                      <Flex justifyContent="space-between" alignItems="center" mb={3}>
                        <Text fontWeight="600" fontSize="16px">GMB Scraped Records ({gmbData.length})</Text>
                        <InputGroup width="250px" borderRadius="4px" borderColor="#CED4DA">
                          <InputLeftElement pointerEvents='none' height="30px">
                            <IoIosSearch color="#6C757D" />
                          </InputLeftElement>
                          <Input
                            placeholder="Search GMB records"
                            border="1px solid #CED4DA!important"
                            size="sm"
                            value={gmbSearchQuery}
                            onChange={(e) => setGmbSearchQuery(e.target.value)}
                          />
                        </InputGroup>
                      </Flex>
                      <TableContainer overflowY="auto" maxH="350px" w="100%" borderRadius="8px" boxShadow="0px 4px 8px rgba(0, 0, 0, 0.05)">
                        <Table variant="simple" size="sm">
                          <Thead bg="#F8F9FA" position="sticky" top={0} zIndex={1}>
                            <Tr>
                              <Th>#</Th>
                              <Th>Email ID</Th>
                              <Th>Website / Company</Th>
                              <Th>Action</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {gmbData
                              ?.filter((item: any) => {
                                if (gmbSearchQuery) {
                                  return item?.email?.toLowerCase().includes(gmbSearchQuery?.toLowerCase());
                                }
                                return true;
                              })
                              ?.map((data: any, index: number) => (
                                <Tr key={data?._id || index}>
                                  <Td>{index + 1}</Td>
                                  <Td>{data?.email || "NA"}</Td>
                                  <Td cursor={"pointer"}>
                                    <Tooltip label={data?.websiteName || data?.websiteUrl || data?.companyName || "NA"} fontSize="11px">
                                      {(data?.websiteName || data?.websiteUrl || data?.companyName)
                                        ? (data?.websiteName || data?.websiteUrl || data?.companyName)?.substring(0, 25)
                                        : "NA"}
                                    </Tooltip>
                                  </Td>
                                  <Td>
                                    <Button
                                      size="xs"
                                      variant="outline"
                                      borderColor="transparent"
                                      onClick={() => {
                                        setGmbData((prev: any[]) => prev.filter((_, i) => i !== index));
                                      }}
                                    >
                                      <svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M4.5 5.99921C4.63261 5.99921 4.75979 6.05189 4.85355 6.14565C4.94732 6.23942 5 6.3666 5 6.49921V12.4992C5 12.6318 4.94732 12.759 4.85355 12.8528C4.75979 12.9465 4.63261 12.9992 4.5 12.9992C4.36739 12.9992 4.24021 12.9465 4.14645 12.8528C4.05268 12.759 4 12.6318 4 12.4992V6.49921C4 6.3666 4.05268 6.23942 4.14645 6.14565C4.24021 6.05189 4.36739 5.99921 4.5 5.99921ZM7 5.99921C7.13261 5.99921 7.25979 6.05189 7.35355 6.14565C7.44732 6.23942 7.5 6.3666 7.5 6.49921V12.4992C7.5 12.6318 7.44732 12.759 7.35355 12.8528C7.25979 12.9465 7.13261 12.9992 7 12.9992C6.86739 12.9992 6.74021 12.9465 6.64645 12.8528C6.55268 12.759 6.5 12.6318 6.5 12.4992V6.49921C6.5 6.3666 6.55268 6.23942 6.64645 6.14565C6.74021 6.05189 6.86739 5.99921 7 5.99921ZM10 6.49921C10 6.3666 9.94732 6.23942 9.85355 6.14565C9.75979 6.05189 9.63261 5.99921 9.5 5.99921C9.36739 5.99921 9.24021 6.05189 9.14645 6.14565C9.05268 6.23942 9 6.3666 9 6.49921V12.4992C9 12.6318 9.05268 12.759 9.14645 12.8528C9.24021 12.9465 9.36739 12.9992 9.5 12.9992C9.63261 12.9992 9.75979 12.9465 9.85355 12.8528C9.94732 12.759 10 12.6318 10 12.4992V6.49921Z" fill="#DC3545" />
                                        <path fillRule="evenodd" clipRule="evenodd" d="M13.5 3.49921C13.5 3.76442 13.3946 4.01878 13.2071 4.20631C13.0196 4.39385 12.7652 4.49921 12.5 4.49921H12V13.4992C12 14.0296 11.7893 14.5383 11.4142 14.9134C11.0391 15.2885 10.5304 15.4992 10 15.4992H4C3.46957 15.4992 2.96086 15.2885 2.58579 14.9134C2.21071 14.5383 2 14.0296 2 13.4992V4.49921H1.5C1.23478 4.49921 0.98043 4.39385 0.792893 4.20631C0.605357 4.01878 0.5 3.76442 0.5 3.49921V2.49921C0.5 2.23399 0.605357 1.97964 0.792893 1.7921C0.98043 1.60456 1.23478 1.49921 1.5 1.49921H5C5 1.23399 5.10536 0.979636 5.29289 0.7921C5.48043 0.604563 5.73478 0.499207 6 0.499207H8C8.26522 0.499207 8.51957 0.604563 8.70711 0.7921C8.89464 0.979636 9 1.23399 9 1.49921H12.5C12.7652 1.49921 13.0196 1.60456 13.2071 1.7921C13.3946 1.97964 13.5 2.23399 13.5 2.49921V3.49921ZM3.118 4.49921L3 4.55821V13.4992C3 13.7644 3.10536 14.0188 3.29289 14.2063C3.48043 14.3938 3.73478 14.4992 4 14.4992H10C10.2652 14.4992 10.5196 14.3938 10.7071 14.2063C10.8946 14.0188 11 13.7644 11 13.4992V4.55821L10.882 4.49921H3.118ZM1.5 3.49921V2.49921H12.5V3.49921H1.5Z" fill="#DC3545" />
                                      </svg>
                                    </Button>
                                  </Td>
                                </Tr>
                              ))}
                          </Tbody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}
                </TabPanel>

                {/* Tab 2: Facebook Leads */}
                <TabPanel p={"20px"} border="1px solid #DEE2E6" bg="#fff" borderRadius="md">
                  <Box pointerEvents={sourceChecks.facebook ? "auto" : "none"} opacity={sourceChecks.facebook ? 1 : 0.6}>
                    <Box textAlign="center" mb={4}>
                      <Text as="h4" fontSize="18px" fontWeight="600" color="#1A202C">Facebook Scrape</Text>
                      <Text as="p" fontSize="14px" fontWeight="400" color="#6C757D">Scrape leads data from Facebook by using queries and locations below:</Text>
                    </Box>
                    <hr style={{ border: "1px solid #E2E8F0", marginTop: "16px", marginBottom: "24px" }} />

                    <FormControl isRequired mb={4}>
                      <FormLabel marginRight="8px">Query / Categories</FormLabel>
                      <Multiselect
                        style={{ marginTop: "15px" }}
                        options={categoriesData}
                        selectionLimit={5}
                        onSelect={(selectedList: any) => {
                          setSelectedFbCatOptions(selectedList);
                          if (selectedList.length > 0) setFbQueryError("");
                        }}
                        onRemove={(selectedList: any) => {
                          setSelectedFbCatOptions(selectedList);
                          if (selectedList.length === 0) setFbQueryError("Categories / Query are required");
                        }}
                        displayValue="name"
                        closeIcon="cancel"
                        placeholder="Select Options"
                        selectedValues={selectedFbCatOptions}
                        className="multiSelectContainer"
                      />
                      {fbQueryError && <p style={{ color: '#DC3545', fontSize: '12px', marginTop: '4px' }}>{fbQueryError}</p>}
                    </FormControl>

                    <FormControl isRequired mb={4}>
                      <FormLabel marginRight="8px">Location / Country</FormLabel>
                      <Select
                        placeholder="Select Country / Location"
                        value={fbLocation}
                        onChange={(e) => {
                          setFbLocation(e.target.value);
                          if (e.target.value) setFbLocationError("");
                        }}
                        isDisabled={!sourceChecks.facebook}
                      >
                        {countries.map((country) => (
                          <option key={country.isoCode} value={country.name}>
                            {country.name}
                          </option>
                        ))}
                      </Select>
                      {fbLocationError && <p style={{ color: '#DC3545', fontSize: '12px', marginTop: '4px' }}>{fbLocationError}</p>}
                    </FormControl>

                    <FormControl isRequired mb={4}>
                      <FormLabel marginRight="8px">Limits</FormLabel>
                      <Select
                        value={fbLimit}
                        onChange={(e) => {
                          setFbLimit(e.target.value);
                          if (e.target.value) setFbLimitError("");
                        }}
                        isDisabled={!sourceChecks.facebook}
                      >
                        <option value="">Select Limit</option>
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </Select>
                      {fbLimitError && <p style={{ color: '#DC3545', fontSize: '12px', marginTop: '4px' }}>{fbLimitError}</p>}
                    </FormControl>
                  </Box>

                  {/* Facebook Scraped Data Table */}
                  {facebookData?.length > 0 && (
                    <Box mt={5}>
                      <Flex justifyContent="space-between" alignItems="center" mb={3}>
                        <Text fontWeight="600" fontSize="16px">Facebook Scraped Records ({facebookData.length})</Text>
                        <InputGroup width="250px" borderRadius="4px" borderColor="#CED4DA">
                          <InputLeftElement pointerEvents='none' height="30px">
                            <IoIosSearch color="#6C757D" />
                          </InputLeftElement>
                          <Input
                            placeholder="Search Facebook records"
                            border="1px solid #CED4DA!important"
                            size="sm"
                            value={fbSearchQuery}
                            onChange={(e) => setFbSearchQuery(e.target.value)}
                          />
                        </InputGroup>
                      </Flex>
                      <TableContainer overflowY="auto" maxH="350px" w="100%" borderRadius="8px" boxShadow="0px 4px 8px rgba(0, 0, 0, 0.05)">
                        <Table variant="simple" size="sm">
                          <Thead bg="#F8F9FA" position="sticky" top={0} zIndex={1}>
                            <Tr>
                              <Th>#</Th>
                              <Th>Email ID</Th>
                              <Th>Website / Company</Th>
                              <Th>Phone Number</Th>
                              <Th>Action</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {facebookData
                              ?.filter((item: any) => {
                                if (fbSearchQuery) {
                                  return item?.email?.toLowerCase().includes(fbSearchQuery?.toLowerCase());
                                }
                                return true;
                              })
                              ?.map((data: any, index: number) => (
                                <Tr key={data?._id || index}>
                                  <Td>{index + 1}</Td>
                                  <Td>{data?.email || "NA"}</Td>
                                  <Td cursor={"pointer"}>
                                    <Tooltip label={data?.websiteUrl || data?.companyName || data?.businessName || "NA"} fontSize="11px">
                                      {(data?.websiteUrl || data?.companyName || data?.businessName)
                                        ? (data?.websiteUrl || data?.companyName || data?.businessName)?.substring(0, 25)
                                        : "NA"}
                                    </Tooltip>
                                  </Td>
                                  <Td>{data?.phoneNumber || data?.phone || "NA"}</Td>
                                  <Td>
                                    <Button
                                      size="xs"
                                      variant="outline"
                                      borderColor="transparent"
                                      onClick={() => {
                                        setFacebookData((prev: any[]) => prev.filter((_, i) => i !== index));
                                      }}
                                    >
                                      <svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M4.5 5.99921C4.63261 5.99921 4.75979 6.05189 4.85355 6.14565C4.94732 6.23942 5 6.3666 5 6.49921V12.4992C5 12.6318 4.94732 12.759 4.85355 12.8528C4.75979 12.9465 4.63261 12.9992 4.5 12.9992C4.36739 12.9992 4.24021 12.9465 4.14645 12.8528C4.05268 12.759 4 12.6318 4 12.4992V6.49921C4 6.3666 4.05268 6.23942 4.14645 6.14565C4.24021 6.05189 4.36739 5.99921 4.5 5.99921ZM7 5.99921C7.13261 5.99921 7.25979 6.05189 7.35355 6.14565C7.44732 6.23942 7.5 6.3666 7.5 6.49921V12.4992C7.5 12.6318 7.44732 12.759 7.35355 12.8528C7.25979 12.9465 7.13261 12.9992 7 12.9992C6.86739 12.9992 6.74021 12.9465 6.64645 12.8528C6.55268 12.759 6.5 12.6318 6.5 12.4992V6.49921C6.5 6.3666 6.55268 6.23942 6.64645 6.14565C6.74021 6.05189 6.86739 5.99921 7 5.99921ZM10 6.49921C10 6.3666 9.94732 6.23942 9.85355 6.14565C9.75979 6.05189 9.63261 5.99921 9.14645 6.14565C9.05268 6.23942 9 6.3666 9 6.49921V12.4992C9 12.6318 9.05268 12.759 9.14645 12.8528C9.24021 12.9465 9.36739 12.9992 9.5 12.9992C9.63261 12.9992 9.75979 12.9465 9.85355 12.8528C9.94732 12.759 10 12.6318 10 12.4992V6.49921Z" fill="#DC3545" />
                                        <path fillRule="evenodd" clipRule="evenodd" d="M13.5 3.49921C13.5 3.76442 13.3946 4.01878 13.2071 4.20631C13.0196 4.39385 12.7652 4.49921 12.5 4.49921H12V13.4992C12 14.0296 11.7893 14.5383 11.4142 14.9134C11.0391 15.2885 10.5304 15.4992 10 15.4992H4C3.46957 15.4992 2.96086 15.2885 2.58579 14.9134C2.21071 14.5383 2 14.0296 2 13.4992V4.49921H1.5C1.23478 4.49921 0.98043 4.39385 0.792893 4.20631C0.605357 4.01878 0.5 3.76442 0.5 3.49921V2.49921C0.5 2.23399 0.605357 1.97964 0.792893 1.7921C0.98043 1.60456 1.23478 1.49921 1.5 1.49921H5C5 1.23399 5.10536 0.979636 5.29289 0.7921C5.48043 0.604563 5.73478 0.499207 6 0.499207H8C8.26522 0.499207 8.51957 0.604563 8.70711 0.7921C8.89464 0.979636 9 1.23399 9 1.49921H12.5C12.7652 1.49921 13.0196 1.60456 13.2071 1.7921C13.3946 1.97964 13.5 2.23399 13.5 2.49921V3.49921ZM3.118 4.49921L3 4.55821V13.4992C3 13.7644 3.10536 14.0188 3.29289 14.2063C3.48043 14.3938 3.73478 14.4992 4 14.4992H10C10.2652 14.4992 10.5196 14.3938 10.7071 14.2063C10.8946 14.0188 11 13.7644 11 13.4992V4.55821L10.882 4.49921H3.118ZM1.5 3.49921V2.49921H12.5V3.49921H1.5Z" fill="#DC3545" />
                                      </svg>
                                    </Button>
                                  </Td>
                                </Tr>
                              ))}
                          </Tbody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}
                </TabPanel>

                {/* Tab 3: LinkedIn Leads */}
                <TabPanel p={"20px"} border="1px solid #DEE2E6" bg="#fff" borderRadius="md">
                  <Box pointerEvents={sourceChecks.linkedin ? "auto" : "none"} opacity={sourceChecks.linkedin ? 1 : 0.6}>
                    <Box textAlign="center" mb={4}>
                      <Text as="h4" fontSize="18px" fontWeight="600" color="#1A202C">LinkedIn Scrape</Text>
                      <Text as="p" fontSize="14px" fontWeight="400" color="#6C757D">Scrape leads data from LinkedIn by using queries below:</Text>
                    </Box>
                    <hr style={{ border: "1px solid #E2E8F0", marginTop: "16px", marginBottom: "24px" }} />

                    <FormControl isRequired mb={4}>
                      <FormLabel marginRight="8px">Query / Categories</FormLabel>
                      <Multiselect
                        style={{ marginTop: "15px" }}
                        options={categoriesData}
                        selectionLimit={5}
                        onSelect={(selectedList: any) => {
                          setSelectedLiCatOptions(selectedList);
                          if (selectedList.length > 0) setLiQueryError("");
                        }}
                        onRemove={(selectedList: any) => {
                          setSelectedLiCatOptions(selectedList);
                          if (selectedList.length === 0) setLiQueryError("Categories / Query are required");
                        }}
                        displayValue="name"
                        closeIcon="cancel"
                        placeholder="Select Options"
                        selectedValues={selectedLiCatOptions}
                        className="multiSelectContainer"
                      />
                      {liQueryError && <p style={{ color: '#DC3545', fontSize: '12px', marginTop: '4px' }}>{liQueryError}</p>}
                    </FormControl>

                    <FormControl isRequired mb={4}>
                      <FormLabel marginRight="8px">Country</FormLabel>
                      <Select
                        placeholder="Select Country"
                        value={liCountry}
                        onChange={(e) => {
                          setLiCountry(e.target.value);
                          if (e.target.value) setLiCountryError("");
                        }}
                        isDisabled={!sourceChecks.linkedin}
                      >
                        {countries.map((country) => (
                          <option key={country.isoCode} value={country.name}>
                            {country.name}
                          </option>
                        ))}
                      </Select>
                      {liCountryError && <p style={{ color: '#DC3545', fontSize: '12px', marginTop: '4px' }}>{liCountryError}</p>}
                    </FormControl>

                    <FormControl isRequired mb={4}>
                      <FormLabel marginRight="8px">Limits</FormLabel>
                      <Select
                        value={liLimit}
                        onChange={(e) => {
                          setLiLimit(e.target.value);
                          if (e.target.value) setLiLimitError("");
                        }}
                        isDisabled={!sourceChecks.linkedin}
                      >
                        <option value="">Select Limit</option>
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </Select>
                      {liLimitError && <p style={{ color: '#DC3545', fontSize: '12px', marginTop: '4px' }}>{liLimitError}</p>}
                    </FormControl>
                  </Box>

                  {/* LinkedIn Scraped Data Table */}
                  {linkedinData?.length > 0 && (
                    <Box mt={5}>
                      <Flex justifyContent="space-between" alignItems="center" mb={3}>
                        <Text fontWeight="600" fontSize="16px">LinkedIn Scraped Records ({linkedinData.length})</Text>
                        <InputGroup width="250px" borderRadius="4px" borderColor="#CED4DA">
                          <InputLeftElement pointerEvents='none' height="30px">
                            <IoIosSearch color="#6C757D" />
                          </InputLeftElement>
                          <Input
                            placeholder="Search LinkedIn records"
                            border="1px solid #CED4DA!important"
                            size="sm"
                            value={liSearchQuery}
                            onChange={(e) => setLiSearchQuery(e.target.value)}
                          />
                        </InputGroup>
                      </Flex>
                      <TableContainer overflowY="auto" maxH="350px" w="100%" borderRadius="8px" boxShadow="0px 4px 8px rgba(0, 0, 0, 0.05)">
                        <Table variant="simple" size="sm">
                          <Thead bg="#F8F9FA" position="sticky" top={0} zIndex={1}>
                            <Tr>
                              <Th>#</Th>
                              <Th>Email ID</Th>
                              <Th>Website / Company</Th>
                              <Th>Phone Number</Th>
                              <Th>Action</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {linkedinData
                              ?.filter((item: any) => {
                                if (liSearchQuery) {
                                  return item?.email?.toLowerCase().includes(liSearchQuery?.toLowerCase());
                                }
                                return true;
                              })
                              ?.map((data: any, index: number) => (
                                <Tr key={data?._id || index}>
                                  <Td>{index + 1}</Td>
                                  <Td>{data?.email || "NA"}</Td>
                                  <Td cursor={"pointer"}>
                                    <Tooltip label={data?.companyName || data?.websiteUrl || data?.title || "NA"} fontSize="11px">
                                      {(data?.companyName || data?.websiteUrl || data?.title)
                                        ? (data?.companyName || data?.websiteUrl || data?.title)?.substring(0, 25)
                                        : "NA"}
                                    </Tooltip>
                                  </Td>
                                  <Td>{data?.phoneNumber || data?.phone || "NA"}</Td>
                                  <Td>
                                    <Button
                                      size="xs"
                                      variant="outline"
                                      borderColor="transparent"
                                      onClick={() => {
                                        setLinkedinData((prev: any[]) => prev.filter((_, i) => i !== index));
                                      }}
                                    >
                                      <svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M4.5 5.99921C4.63261 5.99921 4.75979 6.05189 4.85355 6.14565C4.94732 6.23942 5 6.3666 5 6.49921V12.4992C5 12.6318 4.94732 12.759 4.85355 12.8528C4.75979 12.9465 4.63261 12.9992 4.5 12.9992C4.36739 12.9992 4.24021 12.9465 4.14645 12.8528C4.05268 12.759 4 12.6318 4 12.4992V6.49921C4 6.3666 4.05268 6.23942 4.14645 6.14565C4.24021 6.05189 4.36739 5.99921 4.5 5.99921ZM7 5.99921C7.13261 5.99921 7.25979 6.05189 7.35355 6.14565C7.44732 6.23942 7.5 6.3666 7.5 6.49921V12.4992C7.5 12.6318 7.44732 12.759 7.35355 12.8528C7.25979 12.9465 7.13261 12.9992 7 12.9992C6.86739 12.9992 6.74021 12.9465 6.64645 12.8528C6.55268 12.759 6.5 12.6318 6.5 12.4992V6.49921C6.5 6.3666 6.55268 6.23942 6.64645 6.14565C6.74021 6.05189 6.86739 5.99921 7 5.99921ZM10 6.49921C10 6.3666 9.94732 6.23942 9.85355 6.14565C9.75979 6.05189 9.63261 5.99921 9.5 5.99921C9.36739 5.99921 9.24021 6.05189 9.14645 6.14565C9.05268 6.23942 9 6.3666 9 6.49921V12.4992C9 12.6318 9.05268 12.759 9.14645 12.8528C9.24021 12.9465 9.36739 12.9992 9.5 12.9992C9.63261 12.9992 9.75979 12.9465 9.85355 12.8528C9.94732 12.759 10 12.6318 10 12.4992V6.49921Z" fill="#DC3545" />
                                        <path fillRule="evenodd" clipRule="evenodd" d="M13.5 3.49921C13.5 3.76442 13.3946 4.01878 13.2071 4.20631C13.0196 4.39385 12.7652 4.49921 12.5 4.49921H12V13.4992C12 14.0296 11.7893 14.5383 11.4142 14.9134C11.0391 15.2885 10.5304 15.4992 10 15.4992H4C3.46957 15.4992 2.96086 15.2885 2.58579 14.9134C2.21071 14.5383 2 14.0296 2 13.4992V4.49921H1.5C1.23478 4.49921 0.98043 4.39385 0.792893 4.20631C0.605357 4.01878 0.5 3.76442 0.5 3.49921V2.49921C0.5 2.23399 0.605357 1.97964 0.792893 1.7921C0.98043 1.60456 1.23478 1.49921 1.5 1.49921H5C5 1.23399 5.10536 0.979636 5.29289 0.7921C5.48043 0.604563 5.73478 0.499207 6 0.499207H8C8.26522 0.499207 8.51957 0.604563 8.70711 0.7921C8.89464 0.979636 9 1.23399 9 1.49921H12.5C12.7652 1.49921 13.0196 1.60456 13.2071 1.7921C13.3946 1.97964 13.5 2.23399 13.5 2.49921V3.49921ZM3.118 4.49921L3 4.55821V13.4992C3 13.7644 3.10536 14.0188 3.29289 14.2063C3.48043 14.3938 3.73478 14.4992 4 14.4992H10C10.2652 14.4992 10.5196 14.3938 10.7071 14.2063C10.8946 14.0188 11 13.7644 11 13.4992V4.55821L10.882 4.49921H3.118ZM1.5 3.49921V2.49921H12.5V3.49921H1.5Z" fill="#DC3545" />
                                      </svg>
                                    </Button>
                                  </Td>
                                </Tr>
                              ))}
                          </Tbody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}
                </TabPanel>

                {/* Tab 4: Yellow Leads */}
                <TabPanel p={"20px"} border="1px solid #DEE2E6" bg="#fff" borderRadius="md">
                  <Box pointerEvents={sourceChecks.yellowpages ? "auto" : "none"} opacity={sourceChecks.yellowpages ? 1 : 0.6}>
                    <Box textAlign="center">
                      <Text as="h4" fontSize="18px" fontWeight="600" color="#1A202C">Yellow Pages Scrape</Text>
                      <Text as="p" fontSize="14px" fontWeight="400" color="#6C757D">Scrape business listings from Yellow Pages by using queries and locations below:</Text>
                    </Box>
                    <hr style={{ border: "1px solid #E2E8F0", marginTop: "24px", marginBottom: "24px" }} />
                    <Box>
                      <Box
                        p="5"
                        borderWidth="1px"
                        borderColor="#EEF4FA"
                        borderRadius="lg"
                        boxShadow="sm"
                        bg="white"
                        w="100%"
                        mb="24px"
                      >
                        {/* Quick Filters */}
                        <Text fontWeight="500" mb="16px">
                          Quick Filter:
                        </Text>

                        <Box>
                          <HStack spacing="3" wrap="wrap">
                            {filterOptions
                              .filter((f) => f.id === "withPhone")
                              .map((filter) => {
                                const isActive = ypQuickFilters.some((f) => f.id === filter.id);
                                return (
                                  <Button
                                    key={filter.id}
                                    onClick={() => handleYpQuickFilters(filter.id)}
                                    bg={isActive ? "#2977FF" : "#F8F9FA"}
                                    color={isActive ? "white" : "#000000"}
                                    _hover={{
                                      bg: isActive ? "#2977FF" : "#E2E8F0",
                                    }}
                                    borderRadius="6px"
                                    fontWeight="500"
                                    py={"6px"}
                                    px={"12px"}
                                    fontSize="16px"
                                    boxShadow={isActive ? "md" : "none"}
                                    transition="all 0.2s ease-in-out"
                                  >
                                    {filter.label}
                                  </Button>
                                );
                              })}
                          </HStack>
                          {/* Active Filters */}
                          {ypQuickFilters.length > 0 && (
                            <>
                              <Text fontWeight="500" my="3">
                                Active Filters
                              </Text>

                              <VStack align="start" flexDirection={"row"} display={"flex"} alignItems={"center"} spacing={4} w="100%">
                                {ypQuickFilters?.length > 1 && (
                                  <VStack
                                    spacing={0}
                                    align="center"
                                    justify="center"
                                    position="relative"
                                    h="80px"
                                    minW="80px"
                                  >
                                    <Box
                                      position="absolute"
                                      top="0"
                                      left="50%"
                                      transform="translateX(-50%)"
                                      w="1px"
                                      h="35%"
                                      bg="gray.300"
                                    />
                                    <Box
                                      position="absolute"
                                      top="-13.5px"
                                      left="53.2px"
                                      transform="rotate(90deg)"
                                      w="1px"
                                      h="35%"
                                      bg="gray.300"
                                    />
                                    <Text
                                      fontSize="xs"
                                      fontWeight="bold"
                                      color="gray.500"
                                      textAlign="center"
                                      zIndex={1}
                                    >
                                      AND
                                    </Text>
                                    <Box
                                      position="absolute"
                                      bottom="-13.5px"
                                      left="53.2px"
                                      transform="rotate(90deg)"
                                      w="1px"
                                      h="35%"
                                      bg="gray.300"
                                    />
                                    <Box
                                      position="absolute"
                                      bottom="0"
                                      left="50%"
                                      transform="translateX(-50%)"
                                      w="1px"
                                      h="35%"
                                      bg="gray.300"
                                    />
                                  </VStack>
                                )}
                                <Box mt={"0px!important"}>
                                  {ypQuickFilters.map((filter) => (
                                    <HStack key={filter.id} marginTop={"0px!important"} align="center" w="100%">
                                      <HStack spacing={4} mt={3} flex="1">
                                        <Select
                                          size="sm"
                                          value={filter.key}
                                          w="150px"
                                          onChange={(e) => {
                                            const newKey = e.target.value;
                                            setYpQuickFilters((prev) =>
                                              prev.map((f) =>
                                                f.id === filter.id ? { ...f, key: newKey } : f
                                              )
                                            );
                                          }}
                                        >
                                          <option value="phone">Phone</option>
                                        </Select>
                                        <Select
                                          size="sm"
                                          value={filter.operator}
                                          w="150px"
                                          onChange={(e) => {
                                            const newOperator = e.target.value;
                                            setYpQuickFilters((prev) =>
                                              prev.map((f) =>
                                                f.id === filter.id
                                                  ? { ...f, operator: newOperator }
                                                  : f
                                              )
                                            );
                                          }}
                                        >
                                          <option value="is blank">Is blank</option>
                                          <option value="is not blank">Is not blank</option>
                                          <option value="equals">Equals</option>
                                        </Select>
                                        <CloseButton
                                          aria-label="Remove Filter"
                                          size="sm"
                                          fontSize={"10px"}
                                          variant="ghost"
                                          color="gray.500"
                                          _hover={{ color: "red.500" }}
                                          onClick={() => handleRemoveYpFilter(filter.id)}
                                        />
                                      </HStack>
                                    </HStack>
                                  ))}
                                </Box>
                              </VStack>
                            </>
                          )}
                        </Box>
                      </Box>

                      <FormControl isRequired mb={"20px"}>
                        <FormLabel marginRight="8px">Categories</FormLabel>
                        <Multiselect
                          style={{ marginTop: "15px" }}
                          options={categoriesData}
                          selectionLimit={5}
                          onSelect={(selectedList: any) => {
                            setSelectedYpCatOptions(selectedList);
                            if (selectedList.length > 0) setYpQueryError("");
                          }}
                          onRemove={(selectedList: any) => {
                            setSelectedYpCatOptions(selectedList);
                            if (selectedList.length === 0) setYpQueryError("Categories are required");
                          }}
                          displayValue="name"
                          closeIcon="cancel"
                          placeholder="Select Options"
                          selectedValues={selectedYpCatOptions}
                          className="multiSelectContainer"
                        />
                        {ypQueryError && <p style={{ color: '#DC3545', fontSize: '12px', marginTop: '4px' }}>{ypQueryError}</p>}
                      </FormControl>

                      <Flex gap={3} w="100%" alignItems="flex-start">
                        <Box flex={1}>
                          <FormControl isRequired>
                            <FormLabel mb={2}>Country</FormLabel>
                            <Select
                              placeholder="Select Country"
                              value={selectedYpCountry}
                              onChange={async (e) => {
                                const value = e.target.value;
                                setSelectedYpCountry(value);
                                if (value) setYpCountryError("");
                                const allcity: any = await getCitiesOfCountry(value);
                                setYpCities(allcity);
                                setSelectedYpCity("");
                              }}
                              isDisabled={!sourceChecks.yellowpages}
                            >
                              {countries.map((country) => (
                                <option key={country.isoCode} value={country.isoCode}>
                                  {country.name}
                                </option>
                              ))}
                            </Select>
                            {ypCountryError && <p style={{ color: '#DC3545', fontSize: '12px', marginTop: '4px' }}>{ypCountryError}</p>}
                          </FormControl>
                        </Box>

                        <Box flex={1}>
                          <FormControl>
                            <FormLabel mb={2}>City</FormLabel>
                            <Select
                              placeholder="Select City"
                              value={selectedYpCity}
                              onChange={(e) => setSelectedYpCity(e.target.value)}
                              isDisabled={!selectedYpCountry || !sourceChecks.yellowpages}
                            >
                              {ypCities?.length > 0 ? (
                                ypCities?.map((city: any, index: any) => (
                                  <option key={index} value={city}>
                                    {city}
                                  </option>
                                ))
                              ) : (
                                <option value="">City not available</option>
                              )}
                            </Select>
                          </FormControl>
                        </Box>

                        <Box flex={1}>
                          <FormControl isRequired>
                            <FormLabel mb={2}>Limits</FormLabel>
                            <Select
                              width="100%"
                              color="#000000!important"
                              value={ypLimit}
                              onChange={(e) => {
                                setYpLimit(e.target.value);
                                if (e.target.value) setYpLimitError("");
                              }}
                              isDisabled={!sourceChecks.yellowpages}
                            >
                              <option value={''}>Select Limit</option>
                              <option value={10}>10</option>
                              <option value={50}>50</option>
                              <option value={100}>100</option>
                              <option value={150}>150</option>
                              <option value={200}>200</option>
                              <option value={250}>250</option>
                              <option value={300}>300</option>
                              <option value={350}>350</option>
                              <option value={400}>400</option>
                              <option value={450}>450</option>
                              <option value={500}>500</option>
                            </Select>
                            {ypLimitError && <p style={{ color: '#DC3545', fontSize: '12px', marginTop: '4px' }}>{ypLimitError}</p>}
                          </FormControl>
                        </Box>
                      </Flex>

                      <Box mb={"15px"}>
                        <Text fontWeight={500} marginRight="8px" mt={3} mb="10px">
                          Advanced parameters
                        </Text>
                        <Box mb={"15px"}>
                          <FormControl mb={"0px"}>
                            <Flex w="100%" alignItems="center" justifyContent={"space-between"}>
                              <FormLabel fontWeight="500" fontSize="16px" color="#212529" mb="0" mr="2" htmlFor="showAsPopup">
                                Phone
                              </FormLabel>
                              <Switch
                                isChecked={showYpPhone}
                                onChange={(event) => { ypPhoneToggle(event.target.checked) }}
                                colorScheme="blue"
                                size="lg"
                                outline={"none"}
                              />
                            </Flex>
                          </FormControl>
                          {showYpPhone && (
                            <Box p={"10px"} mb={"15px"}>
                              <Flex w="100%" alignItems="center" gap={2} justifyContent={"space-between"}>
                                <Box w="50%">
                                  <Text as="span" fontSize="14px" marginRight="8px">
                                    Operator
                                  </Text>
                                  <Select
                                    width="auto"
                                    color="#6C757D"
                                    {...register('ypPhoneOperator', { required: 'Operator is required' })}
                                  >
                                    <option value={'Equals'}>Equals</option>
                                  </Select>
                                  {errors.ypPhoneOperator && <p style={{ color: '#DC3545', fontSize: '12px', marginTop: '4px' }}>{errors.ypPhoneOperator.message as string}</p>}
                                </Box>
                                <Box w="50%">
                                  <Text as="span" fontSize="14px" marginRight="8px">
                                    Values (one of)
                                  </Text>
                                  <Select
                                    width="auto"
                                    color="#6C757D"
                                    {...register('ypPhoneValue', { required: 'Value is required' })}
                                  >
                                    <option value={''}>Select Value</option>
                                    <option value={'id_not_blank'}>Is not blank</option>
                                    <option value={'is_blank'}>Is blank</option>
                                  </Select>
                                  {errors.ypPhoneValue && <p style={{ color: '#DC3545', fontSize: '12px', marginTop: '4px' }}>{errors.ypPhoneValue.message as string}</p>}
                                </Box>
                              </Flex>
                            </Box>
                          )}
                        </Box>

                      </Box>
                    </Box>
                  </Box>

                  {/* Yellow Pages Scraped Data Table */}
                  {yellowpagesData?.length > 0 && (
                    <Box mt={5}>
                      <Flex justifyContent="space-between" alignItems="center" mb={3}>
                        <Text fontWeight="600" fontSize="16px">Yellow Pages Scraped Records ({yellowpagesData.length})</Text>
                        <InputGroup width="250px" borderRadius="4px" borderColor="#CED4DA">
                          <InputLeftElement pointerEvents='none' height="30px">
                            <IoIosSearch color="#6C757D" />
                          </InputLeftElement>
                          <Input
                            placeholder="Search Yellow Pages records"
                            border="1px solid #CED4DA!important"
                            size="sm"
                            value={ypSearchQuery}
                            onChange={(e) => setYpSearchQuery(e.target.value)}
                          />
                        </InputGroup>
                      </Flex>
                      <TableContainer overflowY="auto" maxH="350px" w="100%" borderRadius="8px" boxShadow="0px 4px 8px rgba(0, 0, 0, 0.05)">
                        <Table variant="simple" size="sm">
                          <Thead bg="#F8F9FA" position="sticky" top={0} zIndex={1}>
                            <Tr>
                              <Th>#</Th>
                              <Th>Email ID</Th>
                              <Th>Website / Business</Th>
                              <Th>Phone Number</Th>
                              <Th>Action</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {yellowpagesData
                              ?.filter((item: any) => {
                                if (ypSearchQuery) {
                                  return item?.email?.toLowerCase().includes(ypSearchQuery?.toLowerCase()) ||
                                    item?.businessName?.toLowerCase().includes(ypSearchQuery?.toLowerCase()) ||
                                    item?.companyName?.toLowerCase().includes(ypSearchQuery?.toLowerCase());
                                }
                                return true;
                              })
                              ?.map((data: any, index: number) => (
                                <Tr key={data?._id || index}>
                                  <Td>{index + 1}</Td>
                                  <Td>{data?.email || "NA"}</Td>
                                  <Td cursor={"pointer"}>
                                    <Tooltip label={data?.businessName || data?.companyName || data?.websiteUrl || "NA"} fontSize="11px">
                                      {(data?.businessName || data?.companyName || data?.websiteUrl)
                                        ? (data?.businessName || data?.companyName || data?.websiteUrl)?.substring(0, 25)
                                        : "NA"}
                                    </Tooltip>
                                  </Td>
                                  <Td>{data?.phoneNumber || data?.phone || "NA"}</Td>
                                  <Td>
                                    <Button
                                      size="xs"
                                      variant="outline"
                                      borderColor="transparent"
                                      onClick={() => {
                                        setYellowpagesData((prev: any[]) => prev.filter((_, i) => i !== index));
                                      }}
                                    >
                                      <svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M4.5 5.99921C4.63261 5.99921 4.75979 6.05189 4.85355 6.14565C4.94732 6.23942 5 6.3666 5 6.49921V12.4992C5 12.6318 4.94732 12.759 4.85355 12.8528C4.75979 12.9465 4.63261 12.9992 4.5 12.9992C4.36739 12.9992 4.24021 12.9465 4.14645 12.8528C4.05268 12.759 4 12.6318 4 12.4992V6.49921C4 6.3666 4.05268 6.23942 4.14645 6.14565C4.24021 6.05189 4.36739 5.99921 4.5 5.99921ZM7 5.99921C7.13261 5.99921 7.25979 6.05189 7.35355 6.14565C7.44732 6.23942 7.5 6.3666 7.5 6.49921V12.4992C7.5 12.6318 7.44732 12.759 7.35355 12.8528C7.25979 12.9465 7.13261 12.9992 7 12.9992C6.86739 12.9992 6.74021 12.9465 6.64645 12.8528C6.55268 12.759 6.5 12.6318 6.5 12.4992V6.49921C6.5 6.3666 6.55268 6.23942 6.64645 6.14565C6.74021 6.05189 6.86739 5.99921 7 5.99921ZM10 6.49921C10 6.3666 9.94732 6.23942 9.85355 6.14565C9.75979 6.05189 9.63261 5.99921 9.5 5.99921C9.36739 5.99921 9.24021 6.05189 9.14645 6.14565C9.05268 6.23942 9 6.3666 9 6.49921V12.4992C9 12.6318 9.05268 12.759 9.14645 12.8528C9.24021 12.9465 9.36739 12.9992 9.5 12.9992C9.63261 12.9992 9.75979 12.9465 9.85355 12.8528C9.94732 12.759 10 12.6318 10 12.4992V6.49921Z" fill="#DC3545" />
                                        <path fillRule="evenodd" clipRule="evenodd" d="M13.5 3.49921C13.5 3.76442 13.3946 4.01878 13.2071 4.20631C13.0196 4.39385 12.7652 4.49921 12.5 4.49921H12V13.4992C12 14.0296 11.7893 14.5383 11.4142 14.9134C11.0391 15.2885 10.5304 15.4992 10 15.4992H4C3.46957 15.4992 2.96086 15.2885 2.58579 14.9134C2.21071 14.5383 2 14.0296 2 13.4992V4.49921H1.5C1.23478 4.49921 0.98043 4.39385 0.792893 4.20631C0.605357 4.01878 0.5 3.76442 0.5 3.49921V2.49921C0.5 2.23399 0.605357 1.97964 0.792893 1.7921C0.98043 1.60456 1.23478 1.49921 1.5 1.49921H5C5 1.23399 5.10536 0.979636 5.29289 0.7921C5.48043 0.604563 5.73478 0.499207 6 0.499207H8C8.26522 0.499207 8.51957 0.604563 8.70711 0.7921C8.89464 0.979636 9 1.23399 9 1.49921H12.5C12.7652 1.49921 13.0196 1.60456 13.2071 1.7921C13.3946 1.97964 13.5 2.23399 13.5 2.49921V3.49921ZM3.118 4.49921L3 4.55821V13.4992C3 13.7644 3.10536 14.0188 3.29289 14.2063C3.48043 14.3938 3.73478 14.4992 4 14.4992H10C10.2652 14.4992 10.5196 14.3938 10.7071 14.2063C10.8946 14.0188 11 13.7644 11 13.4992V4.55821L10.882 4.49921H3.118ZM1.5 3.49921V2.49921H12.5V3.49921H1.5Z" fill="#DC3545" />
                                      </svg>
                                    </Button>
                                  </Td>
                                </Tr>
                              ))}
                          </Tbody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}
                </TabPanel>
              </TabPanels>
            </Tabs>

            {isSubmitting && (
              <Box maxW={"100%"} my="15px">
                <CustomProgressBar loading={isSubmitting} />
              </Box>
            )}

            <Box mt="24px" display={"flex"} alignItems={"center"} justifyContent={"space-between"}>
              <Button bg="#6C757D" color="#FFFFFF" mr={3} onClick={handleModalClose} fontSize="16px" fontWeight="500" className={styles.cancaleBtn}>
                Cancel
              </Button>
              <Flex justifyContent="flex-end" gap={3}>
                <Button
                  variant="outline"
                  colorScheme="blue"
                  fontWeight="500"
                  isDisabled={totalCheckedRecordsCount === 0}
                  isLoading={saveLoading}
                  onClick={saveScrapedData}
                >
                  Save {totalCheckedRecordsCount > 0 ? `(${totalCheckedRecordsCount})` : ""}
                </Button>
                <Button
                  type="button"
                  onClick={handleFetchRecords}
                  isLoading={isSubmitting}
                  isDisabled={!isCurrentTabChecked}
                  colorScheme="blue"
                  fontSize="16px"
                  fontWeight="500"
                >
                  Fetch Record
                </Button>
              </Flex>
            </Box>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default GmbSearch;
