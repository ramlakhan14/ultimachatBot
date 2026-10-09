import React, { useRef, useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Box,
  Button,
  Input,
  Text,
  useToast
} from "@chakra-ui/react";

import { callApi } from "../../../../services/callApi";
import ReactQuill from "react-quill";

const EditEmailFormate = ({ onClose, data }: any) => {
  const toast = useToast();
  const [subject, setSubject] = useState("Email Campaign");
  const [isloading, setIsloading] = useState(false);
  const quillRef = React.useRef<any>(null);

  const [emailBody, setEmailBody] = useState(`
    <p>Hello,</p>
    <p>
      I hope this message finds you well. Following our recent discussions
      about scaling your software development capabilities, I wanted to touch
      base and see if there were any further details you'd like to discuss.
    </p>
    <p>Best regards,</p>
  `);
  const toolbarOptions = [
    [{ header: [1, 2, false] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    ['link', 'image'],
    [{ align: [] }],
    ['code-block'],
    ['clean']
  ];

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image', 'color', 'code-block', 'align', 'background'
  ];

  const modules = {
    toolbar: toolbarOptions,
  };

  // console.log("data in edit modal", data);

  React.useEffect(() => {
    if (data?.data) {
      setSubject(data.data?.emailConversation[0]?.subject || "Email Campaign");
      setEmailBody(data.data?.emailConversation[0]?.emailTextContent || "");
    }
  }, [data]);

  const handleSave = async () => {
    const formData = {
      draftEmailId: data?.data?._id || "",
      subject: subject,
      emailTextContent: emailBody,
    }

    try {
      setIsloading(true);
      const response = await callApi("/campaign/emailAssistance/editDraftEmail", "post", formData)
      toast({
        title: response?.data?.message || "Email format saved successfully",
        status: "success",
        isClosable: true,
      });
      const res = await data.fetch()
      // console.log("res", response, res);
      setIsloading(false);
      onClose();

    } catch (error: any) {
      setIsloading(false);
      toast({
        title: error?.response?.data?.message || "Error saving email format",
        status: "error",
        isClosable: true,
      });
      // console.error("Error saving email format:", error);
    }

  };

  const handleEditorChange = (content: string) => {
    // setIsFormTouched(true);
    setEmailBody(content);
  };

  return (
    <Modal isOpen={data?.isOpen} onClose={onClose} size="xl" closeOnOverlayClick={false}>
      <ModalOverlay />
      <ModalContent maxW="900px">
        <ModalHeader>Email Edit</ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          {/* Subject */}
          <Box mb={4}>
            <Text fontSize="sm" fontWeight="600" mb={1}>
              Subject
            </Text>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </Box>

          <Text fontSize="sm" fontWeight="600" mb={1}>
            Email Body
          </Text>
          {/* Toolbar */}
          <Box mb="20px">
            <ReactQuill
              theme="snow"
              ref={quillRef}
              value={emailBody}
              onChange={(content: any) => handleEditorChange(content)}
              style={{ height: '250px' }}
              placeholder="Type your content here..."
              modules={modules}
              formats={formats}
            />

          </Box>
        </ModalBody>

        <ModalFooter mt="10px">
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button isLoading={isloading} color="#fff" bg={"#2977FF"} onClick={handleSave}>
            Save Changes
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default EditEmailFormate;
