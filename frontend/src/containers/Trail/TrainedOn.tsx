import React, { useCallback, useEffect, useRef, useState } from 'react';
import "./TrainedOn.css";
import { Box, Button, Flex, Spinner, FormControl, FormHelperText, FormErrorMessage, FormLabel, Heading, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader, ModalOverlay, useDisclosure, useToast } from '@chakra-ui/react';
import { FaAngleDown, FaAngleRight } from "react-icons/fa";
import { Paginator, Paginators } from '../../widgets/Paginator/Paginator';
import MDEditor from '@uiw/react-md-editor';
import { getDomainFromUrl } from "../../utils/commonUtils";
import { chatWidgetDefaultValues } from "../../utils/commonUtils";
import {
  createVisitorKnowledgebase,
  fetchKnowledgebaseVisitorsCrawlData,
  fetchKnowledgebaseVisitorsDetails,
  generateEmbeddingsVisitors,
  fetchKnowledgebaseCrawlDataVisitorsForDocs,
  addTrainingDoc,
  updateWebsiteData,
  deleteKnowledgebase,
} from "../../services/knowledgebaseService";
import {
  CrawlData,
  WebsiteData,
  ProductSetupData,
  DocsKnowledgeData,
} from "../../types/knowledgebase.type";
import { update } from 'lodash';
interface TrainedOnProps {
  items: { url: string; label: string }[];
  addLinkLabel?: string;

}

const TrainedOn: React.FC<any> = ({ items, addLinkLabel = '+ Add Link' }) => {
  const [isListVisible, setIsListVisible] = useState(true);
  const [links, setLinks] = useState(items);
  const [count, setCount] = useState(2);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const ulRef = useRef<HTMLUListElement>(null);
  const ulRefs = useRef([]);
  const initialRef = React.useRef(null)
  const finalRef = React.useRef(null)
  const [pageUrl, setPageUrl] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [knowledgeBaseId, setKnowledgeBaseId] = React.useState<string>("");
  const [isUploadingDocs, setIsUploadingDocs] = React.useState<boolean>(false);
  const [docsDataLoading, setDocsDataLoading] = React.useState<boolean>(false);
  const [docsData, setDocsData] = React.useState<any>();
  const [defaultCrauledData, setDefaultCrauledData] = React.useState<any[]>([]);
  const [paginatorsId, setPaginatorsId] = React.useState<number>();
  const [paginatorsData, setPaginatorsData] = useState({});
  const [productSetupLoadingText, setProductSetupLoadingText] = React.useState(
    "Crawling your website data.. "
  );
  const [apiLoading, setApiLoading] = useState(false);

  const [isValid, setIsValid] = React.useState(null);
  // const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState('');

  const toast = useToast();
  interface FormValues {
    websiteUrl: string;
    target?: string[];
    exclude?: string[];
    files: File[];
  }
  interface WebsiteData {
    name: string;
    websiteUrl: string;
    urls: string[];
    include: string[];
    exclude: string[];
  }

  interface ProductSetupData {
    websiteData: WebsiteData;
    files: File[];
  }

  const dropDown = () => {
    setIsListVisible(!isListVisible);

    const updatedItems = defaultCrauledData.map(item =>
    ({
      ...item,
      isListVisible: false
    })
    );
    setDefaultCrauledData(updatedItems);

  };

  const removeLink = (index: number) => {

    const newLinks = {
      ...links,
      urls: links.urls.filter((_: any, i: any) => i !== index)
    };
    setLinks(newLinks);
  };

  const removeLinkd = (index: number, id: number) => {


    setDefaultCrauledData((prevItems) =>
      prevItems.map((item) =>
        item.knowledgebaseId === id
          ? {
            ...item,
            urls: item.urls.filter((_: any, idx: any) => idx !== index) // Remove item at specified index from urls array
          }
          : item
      )
    );
  };

  const removeLinks = () => {
    setLinks([]);
  };

  const removeLinkss = (id: number) => {

    setDefaultCrauledData((prevItems) => {
      const indexToRemove = prevItems.findIndex((item) => item.knowledgebaseId === id);
      if (indexToRemove === -1) return prevItems; // If the item is not found, return the original array
      return [
        ...prevItems.slice(0, indexToRemove), // Items before the one to remove
        ...prevItems.slice(indexToRemove + 1) // Items after the one to remove
      ];
    });

    // setLinks([]);
  };
  const [loading, setLoading] = useState(false); // Add a loading state to prevent multiple calls

  const handlePageClick = React.useCallback(async (page) => {
    let Pages: number = page + 1;

    const _crawlDataResponse = await fetchKnowledgebaseVisitorsCrawlData(items.knowledgebaseId, Pages);

    const _data = {

      stats: items?.stats,
      urls: _crawlDataResponse.data.results,

      knowledgebaseId: items.knowledgebaseId
    }

    setLinks(_data);

  }, []);

  const handlePageClicks = React.useCallback(async (page, id) => {


    let Pages = page + 1;
    const _crawlDataResponse = await fetchKnowledgebaseVisitorsCrawlData(id, Pages);


    setDefaultCrauledData((prevItems) =>
      prevItems.map((item) =>
        item.knowledgebaseId == id ? {
          ...item,
          urls: _crawlDataResponse.data.results,

          knowledgebaseId: id,
        } : item
      )
    );




  }, []);
  ;



  useEffect(() => {
    const handleScroll = () => {
      if (isListVisible) {
        if (ulRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = ulRef.current;
          if (scrollTop + clientHeight + 1 >= scrollHeight) {
            handlePageClick(count);
          }
        }
      }
    };
    const ulElement = ulRef.current;
    ulElement?.addEventListener('scroll', handleScroll);

    return () => {
      ulElement?.removeEventListener('scroll', handleScroll);
    };
  }, [handlePageClick, count, isListVisible]);


  const handleQuestionChange = React.useCallback((e) => {
    setPageUrl(e.target.value);
  }, []);

  function isValidUrlFormat(url: any) {
    const regex = /^(https?:\/\/)((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|((\d{1,3}\.){3}\d{1,3}))(\:\d+)?(\/[-a-z\d%_.~+]*)*(\?[;&a-z\d%_.~+=-]*)?(\#[-a-z\d_]*)?$/i;
    return regex.test(url);
  }



  const handleClick = async (websiteUrl: string) => {

    // Assume empty arrays for target, exclude, and files if not provided
    setApiLoading(true);
    const formValues: FormValues = {
      websiteUrl: websiteUrl,
      target: [],
      exclude: [],
      files: [],
    };

    // Process target paths
    let targetPaths: string[] = [];
    if (formValues.target) {
      targetPaths = formValues.target.map((path) => path.trim());
    }

    // Process exclude paths
    let excludePaths: string[] = [];
    if (formValues.exclude) {
      excludePaths = formValues.exclude.map((path) => path.trim());
    }

    // Determine chatbot name
    let chatbotName = "";
    if (formValues.websiteUrl) {
      chatbotName = getDomainFromUrl(formValues.websiteUrl);
    } else if (formValues.files.length > 0) {
      chatbotName = formValues.files[0].name;
    }

    const websiteData: WebsiteData = {
      name: chatbotName,
      websiteUrl: formValues.websiteUrl,
      urls: [],
      include: targetPaths,
      exclude: excludePaths,
    };

    const payLoad: ProductSetupData = {
      websiteData: websiteData,
      files: formValues.files,
    };
    // chatWidgetDefaultValues.welcomeMessage = `${payLoad.websiteData.name}`;
    const response = await createVisitorKnowledgebase(payLoad.websiteData);


    setKnowledgeBaseId(response.data._id);
    let _docsData: DocsKnowledgeData;


    if (payLoad.files?.length && payLoad.files.length > 0) {
      setIsUploadingDocs(true);
      for (const file of payLoad.files) {
        try {
          await addTrainingDoc(response.data._id, file);
        } catch (error: any) {

          toast({
            title: `${file.name} failed to upload. ${error?.response?.data?.message || ""
              }`,
            status: "error",
            isClosable: true,
          });
        }
      }
      setIsUploadingDocs(false);
      setDocsDataLoading(true);
      const _docsDataResponse = await fetchKnowledgebaseCrawlDataVisitorsForDocs(
        response.data._id,
        1
      );
      _docsData = {
        docs: _docsDataResponse.data.results,
        pages: _docsDataResponse.data.pages,
        knowledgebaseId: response.data._id,
      };
      setDocsData(_docsData);
      setDocsDataLoading(false);
    }
    let interval = setInterval(async () => {

      const details = await fetchKnowledgebaseVisitorsDetails(response.data._id);

      if (details.data.websiteData !== null) {


        setProductSetupLoadingText(
          "Crawling your website data.."
        );
      }
      const chatBotId = details.data._id;
      if (
        details.data.status === "CRAWLED" ||
        (details.data.status === "CREATED" &&
          _docsData &&
          _docsData.docs.length > 0)
      ) {


        setProductSetupLoadingText(
          "Training with your data..."
        );
        await generateEmbeddingsVisitors(chatBotId);
      } else if (
        details.data.status === "CRAWL_ERROR" ||
        details.data.status === "EMBEDDING_ERROR" ||
        (details.data.websiteData === null &&
          (_docsData === undefined || _docsData.docs.length === 0))
      ) {
        clearInterval(interval);
        setIsSubmitting(false);
        toast({
          title: `Oops! Something went wrong`,
          status: "error",
          isClosable: true,
        });
      } else if (details.data.status === "GENERATING_EMBEDDINGS") {

        setProductSetupLoadingText(
          "Training  with your data..."
        );
      } else if (details.data.status === "READY") {
        clearInterval(interval);
        const _crawlDataResponse = await fetchKnowledgebaseVisitorsCrawlData(
          chatBotId,
          1
        );
        const _data = {
          stats: details.data.crawlData?.stats,
          urls: _crawlDataResponse.data.results,
          pages: _crawlDataResponse.data.pages,
          knowledgebaseId: details.data._id,
          count: 2,
          isListVisible: false
        };
        setDefaultCrauledData(prevData => [...prevData, _data]);
        setApiLoading(false);
        setIsSubmitting(false);
        toast({
          title: `Your bot created Successfully`,
          status: "success",
          isClosable: true,
        });

      }
    }, 2000);
  };

  const handleSubmit = React.useCallback(async (e) => {
    try {
      setIsSubmitting(true)

      isValidUrlFormat(pageUrl)

      if (isValidUrlFormat(pageUrl) === true) {
        setError('');
        const data = ({
          url: pageUrl,
        });
        setIsListVisible(false);

        const updatedItems = defaultCrauledData.map(item =>
        ({
          ...item,
          isListVisible: false
        })
        );
        setDefaultCrauledData(updatedItems);

        if (data.url === "") {
          return toast({
            title: 'Oops! Something went wrong',
            status: "error",
            isClosable: true,
          });
        }
        handleClick(data.url);

        setPageUrl("")

        onClose()

      } else {
        setError("Please, enter valid URL");

      }

    } catch (error) {

      toast({
        title: 'Please, enter valid URL',
        status: "error",
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [pageUrl, toast]);


  const dropDowns = (id: number) => {
    setPaginatorsId(id);

    // Check the current visibility state of the item with the matching id
    const isCurrentlyVisible = defaultCrauledData.find(item => item.knowledgebaseId === id)?.isListVisible;

    const updatedItems = defaultCrauledData.map(item => {
      if (item.knowledgebaseId === id) {
        // Toggle the isListVisible state for the item with the matching id
        return {
          ...item,
          isListVisible: !isCurrentlyVisible
        };
      }
      // Set isListVisible to false for other items
      return {
        ...item,
        isListVisible: false
      };
    });

    setDefaultCrauledData(updatedItems);
    setIsListVisible(false);
  };

  return (
    <div className="trained-on-url" style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <Heading
          as="h5"
          size="sm"
          sx={{
            fontSize: "16px",
            color: "#1A202C",
            fontWeight: "700",
            marginBottom: "10px",
          }}
        >
          Trained on:
        </Heading>
        <button className="add-link-button" onClick={onOpen} >{addLinkLabel}</button>
      </div>
      <p className="paraTrained">Training gathers data from the provided page and its sub-pages.</p>
      <ul style={{ height: "400px", listStyle: "none", overflowY: "auto", }}>
        <li>
          <ul ref={ulRef} style={{ width: "100%", height: isListVisible ? "auto" : "" }}>
            {links.urls === undefined ? null : links.urls.map((item: any, index: any) => (
              <li key={index} style={{ listStyleType: "none" }}>
                {index === 0 && (
                  <div style={{ cursor: "pointer", display: "flex", alignItems: "baseline", position: "relative", width: "100%" }}>
                    {isListVisible ?
                      <FaAngleDown style={{ color: "#CACACA", marginRight: "8px", position: "absolute", top: "10px" }} onClick={dropDown} /> :
                      <FaAngleRight style={{ color: "#CACACA", marginRight: "8px", position: "absolute", top: "10px" }} onClick={dropDown} />}
                    <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ flexGrow: 1, width: "10px", marginLeft: "22px", color: "#007bff" }}>
                      {item.url}
                    </a>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <div className="trained-status" style={{ marginRight: "10px" }}>Trained</div>
                      <div className="close-icon" onClick={() => removeLinks()} style={{ cursor: "pointer", color: "#CACACA", fontSize: "20px" }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M13.0605 12L18 7.0605L16.9395 6L12 10.9395L7.0605 6L6 7.0605L10.9395 12L6 16.9395L7.0605 18L12 13.0605L16.9395 18L18 16.9395L13.0605 12Z" fill="#CACACA" />
                      </svg>
                      </div>
                    </div>
                  </div>
                )}
                {(index !== 0 && isListVisible) && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", width: "100%" }}>
                    <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ paddingLeft: "24px", flexGrow: 1, width: "10px", color: "#007bff" }}>
                      {item.url}
                    </a>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <div className="trained-status" style={{ marginRight: "10px" }}>Trained</div>
                      <div className="close-icon" onClick={() => removeLink(index)} style={{ cursor: "pointer", color: "#CACACA", fontSize: "20px" }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M13.0605 12L18 7.0605L16.9395 6L12 10.9395L7.0605 6L6 7.0605L10.9395 12L6 16.9395L7.0605 18L12 13.0605L16.9395 18L18 16.9395L13.0605 12Z" fill="#CACACA" />
                      </svg>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            ))}

          </ul>
          {isListVisible ?
            <span>
              {links.urls === undefined ? null :
                items.pages > 1 && <Box mt="4" style={{ position: "absolute", bottom: "0%", width: "100%" }}>
                  <Paginator onPageChange={handlePageClick} pageRangeDisplayed={5}
                    pageCount={items.pages} />
                </Box>}
            </span> :
            null}

        </li>
        <li>
          {defaultCrauledData.length === 0 ? (
            apiLoading ? (
              <div className="loader" style={{ textAlign: "center", display: "flex", marginTop: "20px" }}><Spinner color="#2977FF" mb="4" mr="20px" />{productSetupLoadingText}</div> // Display the loader
            ) : null
          ) : (
            <span>

              {defaultCrauledData.map((url) => (
                <span key={url.knowledgebaseId}>
                  <ul style={{ overflowY: "auto", width: "100%", height: "auto" }}>
                    {url.urls.map((item: any, index: any) => (
                      <li key={index} style={{ listStyleType: "none" }}>
                        {index === 0 && (
                          <div style={{ cursor: "pointer", display: "flex", alignItems: "baseline", position: "relative", width: "100%" }}>
                            {url.isListVisible ? (
                              <FaAngleDown style={{ color: "#CACACA", marginRight: "8px", position: "absolute", top: "10px" }} onClick={() => dropDowns(url.knowledgebaseId)} />
                            ) : (
                              <FaAngleRight style={{ color: "#CACACA", marginRight: "8px", position: "absolute", top: "10px" }} onClick={() => dropDowns(url.knowledgebaseId)} />
                            )}
                            <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ flexGrow: 1, width: "10px", color: "#007bff", marginLeft: "22px" }}>
                              {item.url}
                            </a>
                            <div style={{ display: "flex", alignItems: "center" }}>
                              <div className="trained-status" style={{ marginRight: "10px" }}>Trained</div>
                              <div className="close-icon" onClick={() => removeLinkss(url.knowledgebaseId)} style={{ cursor: "pointer", color: "#CACACA", fontSize: "20px" }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M13.0605 12L18 7.0605L16.9395 6L12 10.9395L7.0605 6L6 7.0605L10.9395 12L6 16.9395L7.0605 18L12 13.0605L16.9395 18L18 16.9395L13.0605 12Z" fill="#CACACA" />
                              </svg></div>
                            </div>
                          </div>
                        )}
                        {index !== 0 && url.isListVisible && (
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", width: "100%" }}>
                            <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ paddingLeft: "24px", flexGrow: 1, width: "10px", color: "#007bff" }}>
                              {item.url}
                            </a>
                            <div style={{ display: "flex", alignItems: "center" }}>
                              <div className="trained-status" style={{ marginRight: "10px" }}>Trained</div>
                              <div className="close-icon" onClick={() => removeLinkd(index, url.knowledgebaseId)} style={{ cursor: "pointer", color: "#CACACA", fontSize: "20px" }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M13.0605 12L18 7.0605L16.9395 6L12 10.9395L7.0605 6L6 7.0605L10.9395 12L6 16.9395L7.0605 18L12 13.0605L16.9395 18L18 16.9395L13.0605 12Z" fill="#CACACA" />
                              </svg>
                              </div>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                  {url.isListVisible && url.pages > 1 && url.knowledgebaseId === paginatorsId && (
                    <span>
                      <Box mt="4" style={{ position: "absolute", bottom: "0%", width: "100%" }}>
                        <Paginators
                          onPageChange={handlePageClicks}
                          pageRangeDisplayed={5}
                          pageCount={url.pages}
                          paginatorsId={url.knowledgebaseId}
                        />
                      </Box>
                    </span>
                  )}
                </span>
              ))}
              {apiLoading ? (
                <div className="loader" style={{ textAlign: "center", display: "flex", marginTop: "20px" }}><Spinner color="#2977FF" mb="4" mr="20px" />{productSetupLoadingText}</div> // Display the loader
              ) : null}
            </span>
          )}
        </li>


      </ul>


      <Box>
        <Box>

        </Box>
        <Modal
          initialFocusRef={initialRef}
          finalFocusRef={finalRef}
          isOpen={isOpen}
          onClose={onClose}

        >
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Add Web Page</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <FormControl isInvalid={!!error}>
                <FormLabel fontSize="sm">Page URL</FormLabel>
                <Input ref={initialRef} value={pageUrl} required
                  onChange={handleQuestionChange} placeholder='Enter URL' />
                {<FormErrorMessage>{error}</FormErrorMessage>}

              </FormControl>
              <Flex mt="8" justifyContent="end">
                <Button colorScheme='blue' fontWeight="500" mr={3} onClick={onClose}>
                  Close
                </Button>
                <Button onClick={handleSubmit} fontWeight="500" colorScheme='blue' isLoading={isSubmitting}>
                  Save
                </Button>

              </Flex>
            </ModalBody>
          </ModalContent>
        </Modal>
      </Box>
    </div>
  );
};

export default TrainedOn;