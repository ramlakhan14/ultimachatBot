import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Box,
  Text,
  Flex,
  Tag,
  TagLabel,
  HStack,
  Select,
  Td,
  Tr,
} from "@chakra-ui/react";
import React from "react";
import TableComponent from "../../TableComponent";
import { PaginatorTwo } from "../../../widgets/Paginator/PaginatorTwo";

export default function EmailDataPreviewOnFileUpload({ modalData, onClose }: any) {
  const [tableData, setTableData] = React.useState<any[]>([]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);
  const [activeFilter, setActiveFilter] = React.useState("all");

  const data = modalData?.data;
  const { allEmails = [], validEmails = [], invalidEmails = [], duplicateEmails = [] } = data || {};

  // Build unified table rows
  React.useEffect(() => {
    if (!modalData?.data) return;

    setTableData(modalData?.data?.allEmails);
    setCurrentPage(1);
  }, [modalData?.data]);

  // FILTER HANDLER
  const applyFilter = (filterKey: string) => {
    setActiveFilter(filterKey);

    let filtered = modalData?.data?.allEmails;

    // console.log("tableData", modalData?.data);


    if (filterKey === "valid") {
      filtered = modalData?.data?.validEmails || []
    } else if (filterKey === "invalid") {
      filtered = modalData?.data?.invalidEmails || []
      // filtered = tableData.filter((i) => i.isInvalid);
    } else if (filterKey === "duplicate") {
      filtered = modalData?.data?.duplicateEmails || []
      // filtered = tableData.filter((i) => i.isDuplicate);
    } else {
      filtered = modalData?.data?.allEmails || []
      // filtered = tableData;
    }

    setTableData(filtered);
    setCurrentPage(1);
  };

  // Pagination
  const totalItems = tableData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedRows = tableData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <Modal isOpen={modalData.isOpen} onClose={onClose} size="4xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <Text fontWeight="bold" fontSize="xl">Email Preview</Text>
          <ModalCloseButton />
        </ModalHeader>

        <ModalBody bg="gray.50" p={5}>
          {/* Filters */}
          <Flex justifyContent="space-between" mb={4}>
            <Text fontSize="lg" fontWeight="600">Uploaded Leads</Text>

            <Flex gap={3} wrap="wrap">
              <Tag cursor="pointer" colorScheme="gray" onClick={() => applyFilter("all")}>
                <TagLabel>All ({data?.allEmails?.length || 0})</TagLabel>
              </Tag>

              <Tag cursor="pointer" colorScheme="green" onClick={() => applyFilter("valid")}>
                <TagLabel>Valid ({data?.count?.valid || 0})</TagLabel>
              </Tag>

              <Tag cursor="pointer" colorScheme="red" onClick={() => applyFilter("invalid")}>
                <TagLabel>Invalid ({data?.count?.invalid || 0})</TagLabel>
              </Tag>

              <Tag cursor="pointer" colorScheme="yellow" onClick={() => applyFilter("duplicate")}>
                <TagLabel>Duplicate ({data?.count?.duplicate || 0})</TagLabel>
              </Tag>
            </Flex>
          </Flex>

          {/* TABLE */}
          <TableComponent
            data={paginatedRows}
            isLoading={false}
            tableHeader={["Email", "Website"]}
            tableDataKeys={["email", "websiteUrl"]}
            customRowRenderer={(row: any, index: number) => (
              <Tr key={index}>
                <Td>{(currentPage - 1) * itemsPerPage + index + 1}</Td>
                <Td>{row.email}</Td>
                <Td>{row.websiteUrl}</Td>
              </Tr>
            )}
          />

          {/* Pagination */}
          <HStack justifyContent="space-between" mt={4}>
            <Text>Total {totalItems} items</Text>

            <PaginatorTwo
              onPageChange={(p) => setCurrentPage(p + 1)}
              pageCount={totalPages}
              forcePage={currentPage - 1}
              pageRangeDisplayed={5}   // ✅ REQUIRED PROP
            />

            <Select width="120px" value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}>
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </Select>
          </HStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
